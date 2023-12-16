mod interfaces;
mod types;
mod utils;

contract Amm {
    // TODO: switch to dep
    use crate::utils::tokens_are_in_order;
    // use dep::token_ordering::tokens_are_in_order;

    use dep::easy_private_state::easy_private_state::EasyPrivateUint;
    use dep::value_note::{
        value_note::{ValueNote, ValueNoteMethods, VALUE_NOTE_LEN},
        utils as value_note_utils,
        balance_utils,
    };
    use dep::protocol_types::constants::EMPTY_NULLIFIED_COMMITMENT;
    use dep::aztec::{
        context::{PrivateContext, Context},
        oracle::get_secret_key::get_secret_key, // used to compute nullifier
        selector::compute_selector, // used to compute function selector for calling a function
        state_vars::{singleton::Singleton, map::Map, public_state::PublicState, set::Set},
        note::{
            note_getter_options::NoteGetterOptions,
            note_header::NoteHeader,
            utils as note_utils,
        },
        types::type_serialization::{ // serialization methods for using booleans and aztec addresses
            bool_serialization::{BoolSerializationMethods, BOOL_SERIALIZED_LEN},
            aztec_address_serialization::{AztecAddressSerializationMethods, AZTEC_ADDRESS_SERIALIZED_LEN},
            field_serialization::{ FieldSerializationMethods, FIELD_SERIALIZED_LEN},
        },
        types::address::{AztecAddress},
    };
    use dep::safe_math::SafeU120;
    use dep::authwit::{
        auth::{
            assert_current_call_valid_authwit,
            assert_current_call_valid_authwit_public,
        },
    };

    use crate::types::safe_u120_serialization::{SAFE_U120_SERIALIZED_LEN, SafeU120SerializationMethods};
    use crate::interfaces::{ShieldswapCalee, Token};

    struct Storage {
        admin: PublicState<AztecAddress, AZTEC_ADDRESS_SERIALIZED_LEN>,
        token0: PublicState<AztecAddress, AZTEC_ADDRESS_SERIALIZED_LEN>,
        token1: PublicState<AztecAddress, AZTEC_ADDRESS_SERIALIZED_LEN>,
        reserve0: PublicState<SafeU120, SAFE_U120_SERIALIZED_LEN>,
        reserve1: PublicState<SafeU120, SAFE_U120_SERIALIZED_LEN>,
        // balances: Map<EasyPrivateUint>,
    }

    impl Storage {
        fn init(context: Context) -> Self {
            Self {
                admin: PublicState::new(context, 1, AztecAddressSerializationMethods),
                token0: PublicState::new(context, 2, AztecAddressSerializationMethods),
                token1: PublicState::new(context, 3, AztecAddressSerializationMethods),
                reserve0: PublicState::new(context, 4, SafeU120SerializationMethods),
                reserve1: PublicState::new(context, 5, SafeU120SerializationMethods),
                // balances: Map::new(context, 6, |context, slot| { EasyPrivateUint::new(context, slot) }),
            }
        }
    }

    #[aztec(private)]
    fn constructor(admin: AztecAddress, token0: AztecAddress, token1: AztecAddress) {
        context.call_public_function(
            context.this_address(),
            compute_selector("_init((Field),(Field),(Field))"),
            [admin.address, token0.address, token1.address]
        );
    }
    #[aztec(public)]
    fn _init(admin: AztecAddress, token0: AztecAddress, token1: AztecAddress) {
        assert(
            (token0.address != 0) & (tokens_are_in_order(token0, token1)), "Shieldswap: INVALID_TOKEN_ADDRESSES"
        );
        storage.admin.write(admin);
        storage.token0.write(token0);
        storage.token1.write(token1);
        storage.reserve0.write(SafeU120::min());
        storage.reserve1.write(SafeU120::min());
    }

    #[aztec(private)]
    fn add_liquidity(
        token0: AztecAddress, token1: AztecAddress, amount0: Field, amount1: Field, nonce0: Field, nonce1: Field
    ) {
        let sender = context.msg_sender();
        Token::at(token0.address).unshield(&mut context, sender, context.this_address(), amount0, nonce0);
        Token::at(token1.address).unshield(&mut context, sender, context.this_address(), amount1, nonce1);

        // // TODO: use K formula
        // storage.balances.at(sender).add((amount0 + amount1), sender);

        context.call_public_function(
            context.this_address(),
            compute_selector("_finalize_add_liquidity((Field),(Field),Field,Field)"),
            [token0.address, token1.address, amount0, amount1]
        );
    }

    #[aztec(public)]
    internal fn _finalize_add_liquidity(token0: AztecAddress, token1: AztecAddress, amount0: Field, amount1: Field) {
        assert(
            (token0.address == storage.token0.read().address)
            & (token1.address == storage.token1.read().address), "Shieldswap: INVALID_TOKEN_ADDRESSES"
        );
        assert((amount0 != 0) & (amount1 != 0), "Shieldswap: INSUFFICIENT_LIQUIDITY_MINTED");
        storage.reserve0.write(storage.reserve0.read().add(SafeU120::new(amount0)));
        storage.reserve1.write(storage.reserve1.read().add(SafeU120::new(amount1)));
    }

    #[aztec(public)]
    fn swap_public(
        amount0_in: Field,
        amount0_out: Field,
        amount1_in: Field,
        amount1_out: Field,
        nonce0: Field,
        nonce1: Field,
        to: AztecAddress,
        should_call: bool
    ) {
        let token0 = storage.token0.read();
        let token1 = storage.token1.read();

        let from = context.msg_sender();
        let this = context.this_address();

        // optimistically transfer tokens out
        context.call_public_function(
            context.this_address(),
            compute_selector("_transfer_if_not_zero((Field),(Field),Field,Field,Field,Field,(Field),(Field))"),
            [token0.address, token1.address, amount0_out, amount1_out, 0, 0, this, to.address]
        );

        if (should_call) {
            ShieldswapCalee::at(to.address).shieldswap_call(&mut context, amount0_out, amount1_out);
        }

        // transfer tokens in
        context.call_public_function(
            context.this_address(),
            compute_selector("_transfer_if_not_zero((Field),(Field),Field,Field,Field,Field,(Field),(Field))"),
            [token0.address, token1.address, amount0_in, amount1_in, nonce0, nonce1, from, this]
        );

        context.call_public_function(
            context.this_address(),
            compute_selector("_finalize_swap((Field),(Field),Field,Field,Field,Field)"),
            [token0.address, token1.address, amount0_in, amount0_out, amount1_in, amount1_out]
        );
    }

    // this is needed because the compiler allows only up to 4 public calls per function
    #[aztec(public)]
    internal fn _transfer_if_not_zero(
        token0: AztecAddress,
        token1: AztecAddress,
        amount0: Field,
        amount1: Field,
        nonce0: Field,
        nonce1: Field,
        from: AztecAddress,
        to: AztecAddress
    ) {
        if amount0 != 0 {
            Token::at(token0.address).transfer_public(&mut context, from.address, to.address, amount0, nonce0);
        }
        if amount1 != 0 {
            Token::at(token1.address).transfer_public(&mut context, from.address, to.address, amount1, nonce1);
        }
    }

    #[aztec(private)]
    fn swap(
        token0: AztecAddress,
        token1: AztecAddress,
        amount0_in: Field,
        amount0_out: Field,
        amount1_in: Field,
        amount1_out: Field,
        nonce0: Field,
        nonce1: Field,
        secret_hash: Field
    ) {
        let from = context.msg_sender();
        let this = context.this_address();
        // optimistically transfer tokens out
        // TODO: with if statements this is not compiling (compiler bug probably)
        // if amount0_out != 0 {
        Token::at(token0.address).shield(&mut context, this, amount0_out, secret_hash, 0);
        // }
        // if amount1_out != 0 {
        Token::at(token1.address).shield(&mut context, this, amount1_out, secret_hash, 0);
        // }

        // transfer tokens in
        if amount0_in != 0 {
            Token::at(token0.address).unshield(&mut context, from, this, amount0_in, nonce0);
        }
        if amount1_in != 0 {
            Token::at(token1.address).unshield(&mut context, from, this, amount1_in, nonce1);
        }

        context.call_public_function(
            context.this_address(),
            compute_selector("_finalize_swap((Field),(Field),Field,Field,Field,Field)"),
            [token0.address, token1.address, amount0_in, amount0_out, amount1_in, amount1_out]
        );
    }

    #[aztec(public)]
    internal fn _finalize_swap(
        token0: AztecAddress,
        token1: AztecAddress,
        amount0_in: Field,
        amount0_out: Field,
        amount1_in: Field,
        amount1_out: Field
    ) {
        assert(
            (token0.address == storage.token0.read().address)
            & (token1.address == storage.token1.read().address), "Shieldswap: INVALID_TOKEN_ADDRESSES"
        );
        assert((amount0_in != 0) | (amount1_in != 0), "Shieldswap: INSUFFICIENT_INPUT_AMOUNT");
        assert((amount0_out != 0) | (amount1_out != 0), "Shieldswap: INSUFFICIENT_OUTPUT_AMOUNT");

        let reserve0 = storage.reserve0.read();
        let reserve1 = storage.reserve1.read();

        let reserve0_after = reserve0.add(SafeU120::new(amount0_in)).sub(SafeU120::new(amount0_out));
        let reserve1_after = reserve1.add(SafeU120::new(amount1_in)).sub(SafeU120::new(amount1_out));

        // validate amount_out
        let k_before = reserve0.mul(reserve1);
        let k_after = reserve0_after.mul(reserve1_after);
        assert(k_after.ge(k_before), "Shieldswap: K");

        // update reserves
        storage.reserve0.write(reserve0_after);
        storage.reserve1.write(reserve1_after);
    }

    unconstrained fn reserves() -> [u120; 2] {
        [storage.reserve0.read().value, storage.reserve1.read().value]
    }

    unconstrained fn tokens() -> [AztecAddress; 2] {
        [storage.token0.read(), storage.token1.read()]
    }

    unconstrained fn balance_of_private(owner: AztecAddress) -> u120 {
        // balance_utils::get_balance(storage.balances.at(owner.address).set)
        0
    }

    unconstrained fn compute_note_hash_and_nullifier(
        contract_address: Field,
        nonce: Field,
        storage_slot: Field,
        serialized_note: [Field; VALUE_NOTE_LEN]
    ) -> [Field; 4] {
        let note_header = NoteHeader::new(contract_address, nonce, storage_slot);
        note_utils::compute_note_hash_and_nullifier(ValueNoteMethods, note_header, serialized_note)
    }
}
