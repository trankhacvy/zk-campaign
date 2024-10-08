import * as borsh from "borsh";

export const campaignSchema: borsh.Schema = {
  struct: {
    campaignId: "u64",
    advertiser: { array: { type: "u8", len: 32 } },
    data: {
      struct: {
        name: "string",
        logo: "string",
        ctaLink: "string",
        startDate: "u64",
        endDate: "u64",
        budget: "u64",
        ratePerClick: "u64",
        clicks: "u64",
        remainingBudget: "u64",
        // status: {
        //   enum: [
        //     {
        //       struct: {
        //         upcoming: "u8",
        //       },
        //     },
        //     {
        //       struct: {
        //         ongoing: "u8",
        //       },
        //     },
        //     {
        //       struct: {
        //         completed: "u8",
        //       },
        //     },
        //     {
        //       struct: {
        //         cancelled: "u8",
        //       },
        //     },
        //   ],
        // },
      },
    },
  },
};
