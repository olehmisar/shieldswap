use dep::aztec::{
  context::{PrivateContext, PublicContext, Context},
  selector::compute_selector,
  types::address::AztecAddress,
};

struct ShieldswapPair {
  address: Field,
}

impl ShieldswapPair {
  pub fn at(address: Field) -> Self {
    Self { address }
  }

  pub fn swap_public(self: Self, context: &mut PublicContext,
        amount0_in: Field,
        amount0_out: Field,
        amount1_in: Field,
        amount1_out: Field,
        nonce0: Field,
        nonce1: Field,
        to: Field,
        should_call: bool,
  ) {
    context.call_public_function(
      self.address,
      compute_selector("swap_public(Field,Field,Field,Field,Field,Field,(Field),bool)"),
      [
        amount0_in,
        amount0_out,
        amount1_in,
        amount1_out,
        nonce0,
        nonce1,
        to,
        should_call as Field,
      ],
    );
  }
}
