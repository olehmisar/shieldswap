use dep::aztec::{
  context::{ PrivateContext, PublicContext, Context },
  selector::compute_selector,
  types::address::AztecAddress,
};

struct Token {
  address: Field,
}

impl Token {
  pub fn at(address: Field) -> Self {
    Self { address }
  }

  pub fn shield(self: Self, context: &mut PrivateContext, from: Field, amount: Field, secret_hash: Field, nonce: Field) {
    context.call_public_function(
      self.address,
      compute_selector("shield((Field),Field,Field,Field)"),
      [from, amount, secret_hash, nonce]
    );
  }

  pub fn unshield(self: Self, context: &mut PrivateContext, from: Field, to: Field,  amount: Field, nonce: Field) {
    context.call_private_function(
      self.address,
      compute_selector("unshield((Field),(Field),Field,Field)"),
      [from, to, amount, nonce]
    );
  }

  pub fn transfer_public(self: Self, context: &mut PublicContext, from: Field, to: Field, amount: Field, nonce: Field) {
    context.call_public_function(
      self.address,
      compute_selector("transfer_public((Field),(Field),Field,Field)"),
      [from, to, amount, nonce]
    );
  }

}

struct ShieldswapCallee {
  address: Field,
}

impl ShieldswapCallee {
  pub fn at(address: Field) -> Self {
    Self { address }
  }

  pub fn shieldswap_call(self: Self, context: &mut PublicContext, amount0: Field, amount1: Field) {
    context.call_public_function(
      self.address,
      compute_selector("shieldswap_call(Field,Field)"),
      [amount0, amount1]
    );
  }
}
