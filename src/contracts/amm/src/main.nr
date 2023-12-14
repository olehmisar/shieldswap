mod interfaces;
mod utils;

contract Amm {
    use crate::interfaces::Token;

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

    struct Storage {
        admin: PublicState<AztecAddress, AZTEC_ADDRESS_SERIALIZED_LEN>,
        token0: PublicState<AztecAddress, AZTEC_ADDRESS_SERIALIZED_LEN>,
        token1: PublicState<AztecAddress, AZTEC_ADDRESS_SERIALIZED_LEN>,
        reserve0: PublicState<Field, FIELD_SERIALIZED_LEN>,
        reserve1: PublicState<Field, FIELD_SERIALIZED_LEN>,
        // balances: Map<EasyPrivateUint>,
    }

    impl Storage {
        fn init(context: Context) -> Self {
            Self {
                admin: PublicState::new(context, 1, AztecAddressSerializationMethods),
                token0: PublicState::new(context, 2, AztecAddressSerializationMethods),
                token1: PublicState::new(context, 3, AztecAddressSerializationMethods),
                reserve0: PublicState::new(context, 4, FieldSerializationMethods),
                reserve1: PublicState::new(context, 5, FieldSerializationMethods),
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
        assert(token0.address != 0, "token0 address is not valid"); // sufficient chekc
        assert(tokens_are_in_order(token0, token1), "token0 must be less than token1");
        storage.admin.write(admin);
        storage.token0.write(token0);
        storage.token1.write(token1);
        storage.reserve0.write(0);
        storage.reserve1.write(0);
    }

    #[aztec(private)]
    fn add_liquidity(
        token0: AztecAddress,
        token1: AztecAddress,
        amount0: Field,
        amount1: Field,
        nonce0: Field,
        nonce1: Field
    ) {
        context.call_public_function(
            context.this_address(),
            compute_selector("_assert_valid_tokens((Field),(Field))"),
            [token0.address, token1.address]
        );
        let sender = context.msg_sender();
        Token::at(token0.address).unshield(&mut context, sender, context.this_address(), amount0, nonce0);
        Token::at(token1.address).unshield(&mut context, sender, context.this_address(), amount1, nonce1);

        context.call_public_function(
            context.this_address(),
            compute_selector("_increase_reserves(Field,Field)"),
            [amount0, amount1]
        );
        // // TODO: use K formula
        // storage.balances.at(sender).add((amount0 + amount1), sender);
    }

    #[aztec(private)]
    fn swap(
        tokenIn: AztecAddress,
        tokenOut: AztecAddress,
        amountIn: Field,
        amountOut: Field,
        secret_hash: Field,
        nonce: Field
    ) {
        context.call_public_function(
            context.this_address(),
            compute_selector("_assert_valid_swap((Field),(Field),Field,Field)"),
            [tokenIn.address, tokenOut.address, amountIn, amountOut]
        );

        let sender = context.msg_sender();
        Token::at(tokenIn.address).unshield(&mut context, sender, context.this_address(), amountIn, nonce);
        Token::at(tokenOut.address).shield(&mut context, context.this_address(), amountOut, secret_hash, 0);

        context.call_public_function(
            context.this_address(),
            compute_selector("_update_reserves_after_swap((Field),(Field),Field,Field)"),
            [tokenIn.address, tokenOut.address, amountIn, amountOut]
        );
    }

    #[aztec(public)]
    internal fn _assert_valid_tokens(token0: AztecAddress, token1: AztecAddress) {
        assert(token0.address == storage.token0.read().address, "token0 address is not valid");
        assert(token1.address == storage.token1.read().address, "token1 address is not valid");
    }

    #[aztec(public)]
    internal fn _increase_reserves(amount0: Field, amount1: Field) {
        storage.reserve0.write(storage.reserve0.read() + amount0);
        storage.reserve1.write(storage.reserve1.read() + amount1);
    }

    #[aztec(public)]
    internal fn _assert_valid_swap(tokenIn: AztecAddress, tokenOut: AztecAddress, amountIn: Field, amountOut: Field) {
        assert(amountIn != 0, "amountIn must be greater than 0");
        assert(amountOut != 0, "amountOut must be greater than 0");

        let mut token0 = storage.token0.read();
        let mut token1 = storage.token1.read();
        assert(
            (((token0.address == tokenIn.address) & (token1.address == tokenOut.address))
            | ((token0.address == tokenOut.address) & (token1.address == tokenIn.address))), "invalid tokenIn or tokenOut"
        );

        let reserve0 = storage.reserve0.read();
        let reserve1 = storage.reserve1.read();
        let mut reserveIn = reserve0;
        let mut reserveOut = reserve1;
        if (tokenIn.address == token1.address) {
            reserveIn = reserve1;
            reserveOut = reserve0;
        }

        let reserve_in_after = SafeU120::new(reserveIn + amountIn);
        let reserve_out_after = SafeU120::new(reserveOut).sub(SafeU120::new(amountOut));

        let k_before = SafeU120::new(reserveIn).mul(SafeU120::new(reserveOut));
        let k_after = reserve_in_after.mul(reserve_out_after);
        assert(k_after.ge(k_before), "K invariant");
    }

    #[aztec(public)]
    internal fn _update_reserves_after_swap(tokenIn: AztecAddress, tokenOut: AztecAddress, amountIn: Field, amountOut: Field) {
        let mut reserve0 = storage.reserve0.read();
        let mut reserve1 = storage.reserve1.read();
        let token0 = storage.token0.read();
        if (tokenIn.address == token0.address) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }
        storage.reserve0.write(reserve0);
        storage.reserve1.write(reserve1);
    }

    unconstrained fn reserves() -> [u120; 2] {
        [SafeU120::new(storage.reserve0.read()).value, SafeU120::new(storage.reserve1.read()).value]
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
