use dep::aztec::types::address::{AztecAddress};

pub fn tokens_are_in_order(tokenA: AztecAddress, tokenB: AztecAddress) -> bool {
    let a = tokenA.address.to_be_bytes(32);
    let b = tokenB.address.to_be_bytes(32);
    assert((a.len() == 32) & (b.len() == 32), "addresses are not 32 bytes");
    let mut in_order = false;
    for i in 0..32 {
        if ((a[i] < b[i]) & (!in_order)) {
            in_order = true;
        }
    }
    in_order & (tokenA.address != tokenB.address)
}
