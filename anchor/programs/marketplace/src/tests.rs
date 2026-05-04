#[cfg(test)]
mod tests {
    use crate::ID as PROGRAM_ID;
    use litesvm::LiteSVM;
    use solana_sdk::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        system_program,
        transaction::Transaction,
    };

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    // --- PDA helpers ---

    fn get_asset_pda(creator: &Pubkey, asset_id: &str) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"asset", creator.as_ref(), asset_id.as_bytes()],
            &PROGRAM_ID,
        )
    }

    fn get_purchase_pda(buyer: &Pubkey, asset: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"purchase", buyer.as_ref(), asset.as_ref()],
            &PROGRAM_ID,
        )
    }

    // --- Instruction builders ---

    fn create_asset_ix(
        creator: &Pubkey,
        asset_pda: &Pubkey,
        asset_id: &str,
        price: u64,
        license_type: u8, // 0 = Personal, 1 = Commercial
    ) -> Instruction {
        // Anchor discriminator: sha256("global:create_asset")[0..8]
        let discriminator: [u8; 8] = [28, 42, 120, 51, 7, 38, 156, 136];
        let mut data = discriminator.to_vec();

        // asset_id: String (4 bytes len + bytes)
        let id_bytes = asset_id.as_bytes();
        data.extend_from_slice(&(id_bytes.len() as u32).to_le_bytes());
        data.extend_from_slice(id_bytes);

        // price: u64
        data.extend_from_slice(&price.to_le_bytes());

        // license_type: enum (1 byte)
        data.push(license_type);

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*creator, true),
                AccountMeta::new(*asset_pda, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data,
        }
    }

    fn purchase_asset_ix(
        buyer: &Pubkey,
        creator: &Pubkey,
        asset_pda: &Pubkey,
        purchase_pda: &Pubkey,
    ) -> Instruction {
        // Anchor discriminator: sha256("global:purchase_asset")[0..8]
        let discriminator: [u8; 8] = [141, 216, 187, 174, 119, 200, 123, 167];

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new(*buyer, true),
                AccountMeta::new(*creator, false),
                AccountMeta::new_readonly(*asset_pda, false),
                AccountMeta::new(*purchase_pda, false),
                AccountMeta::new_readonly(system_program::ID, false),
            ],
            data: discriminator.to_vec(),
        }
    }

    fn verify_license_ix(
        buyer: &Pubkey,
        asset_pda: &Pubkey,
        purchase_pda: &Pubkey,
    ) -> Instruction {
        // Anchor discriminator: sha256("global:verify_license")[0..8]
        let discriminator: [u8; 8] = [244, 67, 31, 199, 228, 161, 38, 192];

        Instruction {
            program_id: PROGRAM_ID,
            accounts: vec![
                AccountMeta::new_readonly(*buyer, false),
                AccountMeta::new_readonly(*asset_pda, false),
                AccountMeta::new_readonly(*purchase_pda, false),
            ],
            data: discriminator.to_vec(),
        }
    }

    // --- Tests ---

    #[test]
    fn test_create_asset() {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/marketplace.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let creator = Keypair::new();
        svm.airdrop(&creator.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let asset_id = "asset-001";
        let price = 500_000_000u64; // 0.5 SOL
        let (asset_pda, _) = get_asset_pda(&creator.pubkey(), asset_id);

        let ix = create_asset_ix(&creator.pubkey(), &asset_pda, asset_id, price, 0);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&creator.pubkey()),
            &[&creator],
            blockhash,
        );

        let result = svm.send_transaction(tx);
        assert!(result.is_ok(), "create_asset should succeed: {:?}", result);

        // Asset account should exist
        let asset_account = svm.get_account(&asset_pda);
        assert!(asset_account.is_some(), "Asset PDA should exist");
    }

    #[test]
    fn test_purchase_asset() {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/marketplace.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let creator = Keypair::new();
        let buyer = Keypair::new();
        svm.airdrop(&creator.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&buyer.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let asset_id = "asset-002";
        let price = 500_000_000u64;
        let (asset_pda, _) = get_asset_pda(&creator.pubkey(), asset_id);
        let (purchase_pda, _) = get_purchase_pda(&buyer.pubkey(), &asset_pda);

        // Creator lists asset
        let create_ix = create_asset_ix(&creator.pubkey(), &asset_pda, asset_id, price, 1);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&creator.pubkey()),
            &[&creator],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        let creator_balance_before = svm.get_account(&creator.pubkey()).unwrap().lamports;

        // Buyer purchases
        let purchase_ix = purchase_asset_ix(
            &buyer.pubkey(),
            &creator.pubkey(),
            &asset_pda,
            &purchase_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[purchase_ix],
            Some(&buyer.pubkey()),
            &[&buyer],
            blockhash,
        );

        let result = svm.send_transaction(tx);
        assert!(result.is_ok(), "purchase_asset should succeed: {:?}", result);

        // Purchase PDA should exist
        let purchase_account = svm.get_account(&purchase_pda);
        assert!(purchase_account.is_some(), "Purchase PDA should exist");

        // Creator should have received payment
        let creator_balance_after = svm.get_account(&creator.pubkey()).unwrap().lamports;
        assert_eq!(creator_balance_after, creator_balance_before + price);
    }

    #[test]
    fn test_verify_license() {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/marketplace.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let creator = Keypair::new();
        let buyer = Keypair::new();
        svm.airdrop(&creator.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&buyer.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let asset_id = "asset-003";
        let price = 100_000_000u64;
        let (asset_pda, _) = get_asset_pda(&creator.pubkey(), asset_id);
        let (purchase_pda, _) = get_purchase_pda(&buyer.pubkey(), &asset_pda);

        // Create asset
        let create_ix = create_asset_ix(&creator.pubkey(), &asset_pda, asset_id, price, 0);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&creator.pubkey()),
            &[&creator],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Purchase
        let purchase_ix = purchase_asset_ix(
            &buyer.pubkey(),
            &creator.pubkey(),
            &asset_pda,
            &purchase_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[purchase_ix],
            Some(&buyer.pubkey()),
            &[&buyer],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Verify license
        let verify_ix = verify_license_ix(&buyer.pubkey(), &asset_pda, &purchase_pda);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[verify_ix],
            Some(&buyer.pubkey()),
            &[&buyer],
            blockhash,
        );

        let result = svm.send_transaction(tx);
        assert!(result.is_ok(), "verify_license should succeed: {:?}", result);
    }

    #[test]
    fn test_cannot_purchase_twice() {
        let mut svm = LiteSVM::new();
        let program_bytes = include_bytes!("../../../target/deploy/marketplace.so");
        svm.add_program(PROGRAM_ID, program_bytes);

        let creator = Keypair::new();
        let buyer = Keypair::new();
        svm.airdrop(&creator.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();
        svm.airdrop(&buyer.pubkey(), 10 * LAMPORTS_PER_SOL).unwrap();

        let asset_id = "asset-004";
        let price = 100_000_000u64;
        let (asset_pda, _) = get_asset_pda(&creator.pubkey(), asset_id);
        let (purchase_pda, _) = get_purchase_pda(&buyer.pubkey(), &asset_pda);

        // Create asset
        let create_ix = create_asset_ix(&creator.pubkey(), &asset_pda, asset_id, price, 0);
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[create_ix],
            Some(&creator.pubkey()),
            &[&creator],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // First purchase
        let purchase_ix = purchase_asset_ix(
            &buyer.pubkey(),
            &creator.pubkey(),
            &asset_pda,
            &purchase_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx = Transaction::new_signed_with_payer(
            &[purchase_ix],
            Some(&buyer.pubkey()),
            &[&buyer],
            blockhash,
        );
        svm.send_transaction(tx).unwrap();

        // Second purchase should fail (PDA already exists)
        let purchase_ix2 = purchase_asset_ix(
            &buyer.pubkey(),
            &creator.pubkey(),
            &asset_pda,
            &purchase_pda,
        );
        let blockhash = svm.latest_blockhash();
        let tx2 = Transaction::new_signed_with_payer(
            &[purchase_ix2],
            Some(&buyer.pubkey()),
            &[&buyer],
            blockhash,
        );

        let result = svm.send_transaction(tx2);
        assert!(result.is_err(), "Second purchase should fail");
    }
}