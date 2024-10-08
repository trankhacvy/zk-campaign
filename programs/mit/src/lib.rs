use anchor_lang::prelude::*;
use borsh::BorshDeserialize;
use light_hasher::bytes::AsByteVec;
use light_sdk::{
    compressed_account::LightAccount, light_account, light_accounts, light_program,
    merkle_context::PackedAddressMerkleContext, LightHasher,
};

declare_id!("7zF2xa5P22ahMqdQYo9P4kjD4qxvUy5hGozmk8DyB3iz");

#[light_program]
#[program]
pub mod mit {
    use anchor_lang::system_program;

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
        unique_link: String,
    ) -> Result<()> {
        msg!("register_affiliate {:?}", &unique_link);

        ctx.light_accounts.affiliate.affiliate_pubkey = ctx.accounts.signer.key();
        ctx.light_accounts.affiliate.total_clicks = 0;
        ctx.light_accounts.affiliate.unique_link = unique_link;

        Ok(())
    }

    pub fn increment<'info>(ctx: LightContext<'_, '_, '_, 'info, Increment<'info>>) -> Result<()> {
        ctx.light_accounts.counter.counter += 1;

        Ok(())
    }

    pub fn delete<'info>(ctx: LightContext<'_, '_, '_, 'info, Delete<'info>>) -> Result<()> {
        Ok(())
    }
}

#[light_account]
#[derive(Clone, Debug, Default)]
pub struct CounterCompressedAccount {
    #[truncate]
    pub owner: Pubkey,
    pub counter: u64,
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

    #[light_account(init, seeds = [b"affiliate", signer.key().as_ref(), campaign.campaign_id.to_le_bytes().as_ref()  ])]
    pub affiliate: LightAccount<AffiliateLink>,
}

#[light_accounts]
pub struct Increment<'info> {
    #[account(mut)]
    #[fee_payer]
    pub signer: Signer<'info>,
    #[self_program]
    pub self_program: Program<'info, crate::program::Mit>,
    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,

    #[light_account(
        mut,
        seeds = [b"counter", signer.key().as_ref()],
        constraint = counter.owner == signer.key() @ CustomError::Unauthorized
    )]
    pub counter: LightAccount<CounterCompressedAccount>,
}

#[light_accounts]
pub struct Delete<'info> {
    #[account(mut)]
    #[fee_payer]
    pub signer: Signer<'info>,
    #[self_program]
    pub self_program: Program<'info, crate::program::Mit>,
    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,

    #[light_account(
        close,
        seeds = [b"counter", signer.key().as_ref()],
        constraint = counter.owner == signer.key() @ CustomError::Unauthorized
    )]
    pub counter: LightAccount<CounterCompressedAccount>,
}

// accounts

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
    #[truncate]
    pub campaign_key: Pubkey,
    #[truncate]
    pub affiliate_pubkey: Pubkey,
    #[truncate]
    pub unique_link: String,
    pub total_clicks: u64,
}
