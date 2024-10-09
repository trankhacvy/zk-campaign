use anchor_lang::prelude::*;
use anchor_lang::system_program;
use borsh::BorshDeserialize;
use light_hasher::bytes::AsByteVec;
use light_sdk::merkle_context::PackedMerkleContext;
use light_sdk::{
    address::derive_address_seed,
    compressed_account::LightAccount,
    light_account, light_accounts, light_program,
    merkle_context::{PackedAddressMerkleContext, PackedMerkleOutputContext},
    proof::CompressedProof,
    utils::create_cpi_inputs_for_new_account,
    verify::verify,
    LightHasher, CPI_AUTHORITY_PDA_SEED,
};

mod utils;

use utils::*;

declare_id!("7zF2xa5P22ahMqdQYo9P4kjD4qxvUy5hGozmk8DyB3iz");

#[light_program]
#[program]
pub mod mit {

    use light_sdk::traits::InvokeCpiAccounts;

    use super::*;

    pub fn create<'info>(
        ctx: LightContext<'_, '_, '_, 'info, Create<'info>>,
        campaign_id: u64,
        data: CampaignData,
    ) -> Result<()> {
        msg!("create campaign {:?}", campaign_id);

        let buget = data.budget;

        ctx.light_accounts.campaign.campaign_id = campaign_id;
        ctx.light_accounts.campaign.advertiser = ctx.accounts.signer.key();
        ctx.light_accounts.campaign.data = data;

        // send fund to vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.signer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            buget,
        )?;

        Ok(())
    }

    pub fn register_affiliate<'info>(
        ctx: LightContext<'_, '_, '_, 'info, RegisterAffiliate<'info>>,
        // ctx: Context<'_, '_, '_, 'info, RegisterAffiliate<'info>>,
        affiliate_proof: CompressedProof,
        unique_link: String,
    ) -> Result<()> {
        msg!("register_affiliate {:?}", &unique_link);

        let campaign = &ctx.light_accounts.campaign;

        let merkle_output_context = PackedMerkleOutputContext {
            merkle_tree_pubkey_index: 0,
        };
        let address_merkle_context = PackedAddressMerkleContext {
            address_merkle_tree_pubkey_index: 1,
            address_queue_pubkey_index: 2,
        };

        let affiliate = AffiliateLink {
            campaign_id: campaign.campaign_id,
            affiliate_pubkey: Pubkey::default(),
            unique_link,
            total_clicks: 0,
            claimed: false,
        };

        let seed = derive_address_seed(
            &[
                b"affiliate",
                ctx.accounts.signer.key().as_ref(),
                campaign.campaign_id.to_le_bytes().as_ref(),
            ],
            &crate::ID,
        );

        let (asset_compressed_account, asset_new_address_params) =
            new_compressed_account_with_discriminator(
                &affiliate,
                &seed,
                &crate::ID,
                &merkle_output_context,
                &address_merkle_context,
                address_merkle_tree_root_index,
                ctx.remaining_accounts,
            )?;

        let cpi_inputs = create_cpi_inputs_for_new_account(
            CompressedProof {
                a: affiliate_proof.a,
                b: affiliate_proof.b,
                c: affiliate_proof.c,
            },
            asset_new_address_params,
            asset_compressed_account,
            None,
        );

        let invoking_program = &ctx.accounts.get_invoking_program().key();
        let bump = Pubkey::find_program_address(&[CPI_AUTHORITY_PDA_SEED], invoking_program).1;
        let signer_seeds = [CPI_AUTHORITY_PDA_SEED, &[bump]];

        // ctx.accounts.get_invoking_program().key();
        // let (_pda, bump) = Pubkey::find_program_address(&[CPI_AUTHORITY_PDA_SEED], &crate::ID);

        // let signer_seeds = [CPI_AUTHORITY_PDA_SEED, &[bump]];

        verify(&ctx, &cpi_inputs, &[&signer_seeds])?;

        Ok(())
    }

    pub fn register_v2<'info>(
        ctx: LightContext<'_, '_, '_, 'info, RegisterAffiliateV2<'info>>,
        campaign_id: u64,
    ) -> Result<()> {
        msg!("register_v2 {:?}", campaign_id);

        Ok(())
    }

    pub fn record_click<'info>(
        ctx: LightContext<'_, '_, '_, 'info, RecordClick<'info>>,
    ) -> Result<()> {
        msg!("record_click");

        ctx.light_accounts.affiliate.total_clicks = ctx
            .light_accounts
            .affiliate
            .total_clicks
            .checked_add(1)
            .unwrap();

        ctx.light_accounts.campaign.data.clicks = ctx
            .light_accounts
            .campaign
            .data
            .clicks
            .checked_add(1)
            .unwrap();

        Ok(())
    }

    pub fn claim<'info>(ctx: LightContext<'_, '_, '_, 'info, Claim<'info>>) -> Result<()> {
        msg!("claim");

        ctx.light_accounts.affiliate.claimed = true;

        // send fund to vault
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.signer.to_account_info(),
                },
            ),
            100,
        )?;

        Ok(())
    }
}

#[error_code]
pub enum CustomError {
    #[msg("No authority to perform this action")]
    Unauthorized,
}

#[light_accounts]
#[instruction(campaign_id: u64)]
pub struct Create<'info> {
    #[account(mut)]
    #[fee_payer]
    pub signer: Signer<'info>,

    #[self_program]
    pub self_program: Program<'info, crate::program::Mit>,

    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,

    #[light_account(init, seeds = [b"campaign", signer.key().as_ref(), campaign_id.to_le_bytes().as_ref()  ])]
    pub campaign: LightAccount<Campaign>,

    #[account(
        init_if_needed,
        seeds = [b"vault", signer.key().as_ref()],
        bump,
        payer = signer,
        space = 8,
    )]
    /// CHECK vault
    pub vault: UncheckedAccount<'info>,
}

#[light_accounts]
// #[light_system_accounts]
// #[derive(Accounts, LightTraits)]
pub struct RegisterAffiliate<'info> {
    #[account(mut)]
    #[fee_payer]
    pub signer: Signer<'info>,

    #[self_program]
    pub self_program: Program<'info, crate::program::Mit>,

    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,

    #[light_account(mut, seeds = [b"campaign", signer.key().as_ref(), campaign.campaign_id.to_le_bytes().as_ref()  ])]
    pub campaign: LightAccount<Campaign>,
    // #[light_account(init, seeds = [b"affiliate", signer.key().as_ref(), campaign.campaign_id.to_le_bytes().as_ref()  ])]
    // pub affiliate: LightAccount<AffiliateLink>,
}

#[light_accounts]
pub struct RegisterAffiliateV2<'info> {
    #[account(mut)]
    #[fee_payer]
    pub signer: Signer<'info>,

    #[self_program]
    pub self_program: Program<'info, crate::program::Mit>,

    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,

    #[light_account(mut, seeds = [b"campaign", signer.key().as_ref(), campaign.campaign_id.to_le_bytes().as_ref()  ])]
    pub campaign: LightAccount<Campaign>,

    #[light_account(init, seeds = [b"affiliate", signer.key().as_ref()  ])]
    pub affiliate: LightAccount<AffiliateLink>,
}

#[light_accounts]
pub struct RecordClick<'info> {
    #[account(mut)]
    #[fee_payer]
    pub signer: Signer<'info>,

    #[self_program]
    pub self_program: Program<'info, crate::program::Mit>,

    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,

    #[light_account(mut, seeds = [b"campaign", signer.key().as_ref(), campaign.campaign_id.to_le_bytes().as_ref()  ])]
    pub campaign: LightAccount<Campaign>,

    #[light_account(mut, seeds = [b"affiliate", signer.key().as_ref(), affiliate.campaign_id.to_le_bytes().as_ref() ])]
    pub affiliate: LightAccount<AffiliateLink>,
}

#[light_accounts]
pub struct Claim<'info> {
    #[account(mut)]
    #[fee_payer]
    pub signer: Signer<'info>,

    #[self_program]
    pub self_program: Program<'info, crate::program::Mit>,

    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,

    #[light_account(mut, seeds = [b"campaign", signer.key().as_ref(), campaign.campaign_id.to_le_bytes().as_ref()  ])]
    pub campaign: LightAccount<Campaign>,

    #[light_account(mut, seeds = [b"affiliate", signer.key().as_ref(), affiliate.campaign_id.to_le_bytes().as_ref()  ])]
    pub affiliate: LightAccount<AffiliateLink>,

    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()],
        bump,
    )]
    /// CHECK vault
    pub vault: UncheckedAccount<'info>,
}

#[light_account]
#[derive(Clone, Debug, Default)]
pub struct Campaign {
    pub campaign_id: u64,
    #[truncate]
    pub advertiser: Pubkey,
    pub data: CampaignData,
}

#[derive(
    InitSpace,
    Clone,
    Debug,
    LightHasher,
    Eq,
    Default,
    PartialEq,
    anchor_lang::AnchorDeserialize,
    anchor_lang::AnchorSerialize,
)]
pub struct CampaignData {
    #[max_len(100)]
    pub name: String,
    #[max_len(100)]
    pub cta_link: String,
    #[max_len(100)]
    pub logo: String,
    pub start_date: u64,
    pub end_date: u64,
    pub budget: u64,
    pub rate_per_click: u64,
    pub clicks: u64,
    pub remaining_budget: u64,
    pub status: CampaignStatus,
}

#[derive(
    InitSpace,
    Clone,
    Debug,
    Eq,
    PartialEq,
    anchor_lang::AnchorDeserialize,
    anchor_lang::AnchorSerialize,
)]
pub enum CampaignStatus {
    Upcoming,
    Ongoing,
    Completed,
    Cancelled,
}

impl Default for CampaignStatus {
    fn default() -> Self {
        CampaignStatus::Upcoming
    }
}

// impl anchor_lang::IdlBuild for CampaignStatus {}

impl AsByteVec for CampaignStatus {
    fn as_byte_vec(&self) -> Vec<Vec<u8>> {
        match self {
            CampaignStatus::Upcoming => vec![vec![0]],
            CampaignStatus::Ongoing => vec![vec![1]],
            CampaignStatus::Completed => vec![vec![2]],
            CampaignStatus::Cancelled => vec![vec![3]],
        }
    }
}

#[light_account]
#[derive(Clone, Debug, Default)]
pub struct AffiliateLink {
    pub campaign_id: u64,
    #[truncate]
    pub affiliate_pubkey: Pubkey,
    #[truncate]
    pub unique_link: String,
    pub total_clicks: u64,
    pub claimed: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct LightRootParams {
    pub inputs: Vec<Vec<u8>>,
    pub proof: CompressedProof,
    pub merkle_context: PackedMerkleContext,
    pub merkle_tree_root_index: u16,
    pub address_merkle_context: PackedAddressMerkleContext,
    pub address_merkle_tree_root_index: u16,
}
