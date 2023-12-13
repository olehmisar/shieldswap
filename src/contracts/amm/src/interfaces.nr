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
}
