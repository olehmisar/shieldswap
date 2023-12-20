use dep::aztec::types::address::{AztecAddress};

pub fn tokens_are_in_order(tokenA: AztecAddress, tokenB: AztecAddress) -> bool {
    let a = tokenA.address.to_be_bytes(32);
    let b = tokenB.address.to_be_bytes(32);
    assert((a.len() == 32) & (b.len() == 32), "addresses are not 32 bytes");
    let mut in_order = true;
    let mut done = false;
    for i in 0..32 {
        if (!done) {
            if (a[i] > b[i]) {
                in_order = false;
                done = true;
            } else if (a[i] < b[i]) {
                in_order = true;
                done = true;
            }
        }
    }
    in_order & (tokenA.address != tokenB.address)
}

#[test]
fn test_random() {
    let a = AztecAddress::new(0x0100c895fffcec154bb5cb5786bf6dba4109df3cef61c40a0ced3a8a9f0a5851);
    let b = AztecAddress::new(0x14cd5a3cd1df59928b84ca35115fedab9b5679668d5c92bcd5c16ca34e36a154);
    assert(tokens_are_in_order(a, b), "tokens not in order");
    assert(!tokens_are_in_order(b, a), "tokens are in order");
}

#[test]
fn test_edge_cases() {
    assert(
        tokens_are_in_order(
            AztecAddress::new(0x0000000000000000000000000000000000000000000000000000000000000000),
            AztecAddress::new(0x0000000000000000000000000000000000000000000000000000000000000001)
        ), "1"
    );
    assert(
        !tokens_are_in_order(
            AztecAddress::new(0x0000000000000000000000000000000000000000000000000000000000000001),
            AztecAddress::new(0x0000000000000000000000000000000000000000000000000000000000000000)
        ), "2"
    );

    assert(
        !tokens_are_in_order(
            AztecAddress::new(0x0000000000000000000000000000000000000000000000000000000000000000),
            AztecAddress::new(0x0000000000000000000000000000000000000000000000000000000000000000)
        ), "3"
    );

    assert(
        !tokens_are_in_order(
            AztecAddress::new(0x1000000000000000000000000000000000000000000000000000000000000000),
            AztecAddress::new(0x0999999999999999999999999999999999999999999999999999999999999999)
        ), "4"
    );
}
