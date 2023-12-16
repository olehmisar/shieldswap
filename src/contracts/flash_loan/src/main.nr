mod interfaces;
mod types;

contract FlashLoan {
    use dep::aztec::{
        context::{PrivateContext, Context},
        oracle::debug_log::debug_log,
        selector::compute_selector, // used to compute function selector for calling a function
        state_vars::{singleton::Singleton, map::Map, public_state::PublicState, set::Set},
        types::type_serialization::{ // serialization methods for using booleans and aztec addresses
            bool_serialization::{BoolSerializationMethods, BOOL_SERIALIZED_LEN},
            aztec_address_serialization::{AztecAddressSerializationMethods, AZTEC_ADDRESS_SERIALIZED_LEN},
            field_serialization::{ FieldSerializationMethods, FIELD_SERIALIZED_LEN},
        },
        types::address::{AztecAddress},
    };
    use dep::safe_math::SafeU120;
    use dep::authwit::auth::{IS_VALID_SELECTOR, assert_current_call_valid_authwit_public, compute_authwit_message_hash};

    use crate::interfaces::ShieldswapPool;
    use crate::types::safe_u120_serialization::{SAFE_U120_SERIALIZED_LEN, SafeU120SerializationMethods};

    struct Storage {
        last_balance_0: PublicState<SafeU120, SAFE_U120_SERIALIZED_LEN>,
        last_balance_1: PublicState<SafeU120, SAFE_U120_SERIALIZED_LEN>,
    }

    impl Storage {
        fn init(context: Context) -> Self {
            Self {
                last_balance_0: PublicState::new(context, 1, SafeU120SerializationMethods),
                last_balance_1: PublicState::new(context, 2, SafeU120SerializationMethods),
            }
        }
    }

    #[aztec(private)]
    fn constructor() {}

    #[aztec(public)]
    fn flash_loan(pool: AztecAddress, amount0: Field, amount1: Field) {
        ShieldswapPool::at(pool.address).swap_public(
            &mut context,
            amount0,
            amount0,
            amount1,
            amount1,
            0,
            0,
            context.this_address(),
            true
        );
    }

    #[aztec(public)]
    fn shieldswap_call(amount0: Field, amount1: Field) {
        storage.last_balance_0.write(SafeU120::new(amount0));
        storage.last_balance_1.write(SafeU120::new(amount1));
    }

    #[aztec(public)]
    fn reset_last_balances() {
        storage.last_balance_0.write(SafeU120::min());
        storage.last_balance_1.write(SafeU120::min());
    }

    #[aztec(public)]
    fn is_valid_public(message_hash: Field) -> pub Field {
        // approve any action (UNSAFE)
        // this allows shieldswap pool to transfer tokens out of this contract
        IS_VALID_SELECTOR
    }

    unconstrained fn last_balances() -> [u120; 2] {
        [storage.last_balance_0.read().value, storage.last_balance_1.read().value]
    }

    unconstrained fn compute_note_hash_and_nullifier(
        contract_address: Field,
        nonce: Field,
        storage_slot: Field,
        serialized_note: [Field; 0]
    ) -> [Field; 4] {
        [0, 0, 0, 0]
    }
}
