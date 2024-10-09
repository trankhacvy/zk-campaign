"use client";

import { BN } from "@coral-xyz/anchor";
import {
  buildTx,
  bn,
  defaultStaticAccountsStruct,
  LightSystemProgram,
  deriveAddressSeed,
  deriveAddress,
  defaultTestStateTreeAccounts,
  PackedMerkleContext,
} from "@lightprotocol/stateless.js";
import {
  AccountMeta,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";

import { CalendarIcon, ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import Link from "next/link";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/hooks/use-toast";
import { useRpc } from "@/hooks/useConnection";
import { useMitProgram } from "@/hooks/useProgram";
import {
  dateToSolanaSlot,
  insertOrGet,
  setComputeUnitLimitIx,
  setComputeUnitPriceIx,
} from "@/lib/helper";
import { cn } from "@/lib/utils";

const CampaignSchema = z.object({
  name: z
    .string()
    .min(4, { message: "Name must be more than 3 characters." })
    .max(265, { message: "Name must be less than 266 characters." }),
  budget: z.coerce
    .number()
    .gt(0, { message: "Budget must be greater than 0." })
    .lt(1000, { message: "Budget must be less than 1000." }),
  ratePerClick: z.coerce
    .number()
    .gt(0, { message: "Rate per click must be greater than 0." }),
  ctaLink: z.string().url({ message: "CTA Link must be a valid URL." }),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export default function Dashboard() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const { toast } = useToast();
  const program = useMitProgram();
  const rpc = useRpc();

  const form = useForm<z.infer<typeof CampaignSchema>>({
    resolver: zodResolver(CampaignSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(data: z.infer<typeof CampaignSchema>) {
    try {
      if (!program || !rpc || !publicKey || !signTransaction) {
        return;
      }

      const campaignId = new BN(Date.now());

      const {
        accountCompressionAuthority,
        noopProgram,
        registeredProgramPda,
        accountCompressionProgram,
      } = defaultStaticAccountsStruct();

      const { addressQueue, addressTree, merkleTree, nullifierQueue } =
        defaultTestStateTreeAccounts();

      const addressSeed = deriveAddressSeed(
        [
          Buffer.from("campaign"),
          publicKey!.toBuffer(),
          campaignId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      let address = deriveAddress(addressSeed);

      console.log("address", address.toBase58());

      const assetProof = await rpc.getValidityProof(undefined, [
        bn(address.toBytes()),
      ]);

      console.log("assetProof", assetProof);

      if (!assetProof) {
        throw new Error("Failed to get base data hash");
      }

      const remainingAccounts: Array<AccountMeta> = [];

      const merkleContext: PackedMerkleContext = {
        merkleTreePubkeyIndex: insertOrGet(remainingAccounts, merkleTree),
        nullifierQueuePubkeyIndex: insertOrGet(
          remainingAccounts,
          nullifierQueue
        ),
        leafIndex: 0,
        queueIndex: null,
      };

      const addressMerkleContext = {
        addressMerkleTreePubkeyIndex: insertOrGet(
          remainingAccounts,
          addressTree
        ),
        addressQueuePubkeyIndex: insertOrGet(remainingAccounts, addressQueue),
      };

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), publicKey!.toBuffer()],
        program.programId
      );

      console.log("vaultPda", vaultPda.toBase58());

      const startAt = await dateToSolanaSlot(data.startDate, connection);
      const endAt = await dateToSolanaSlot(data.endDate, connection);

      const ix = await program.methods
        .create(
          [] as any,
          assetProof.compressedProof,
          merkleContext,
          0,
          addressMerkleContext,
          assetProof.rootIndices[0],
          campaignId,
          {
            name: data.name,
            ctaLink: data.ctaLink,
            logo: "",
            startDate: new BN(startAt),
            endDate: new BN(endAt),
            budget: new BN(data.budget * LAMPORTS_PER_SOL),
            ratePerClick: new BN(data.ratePerClick * LAMPORTS_PER_SOL),
            clicks: new BN(0),
            remainingBudget: new BN(0),
            status: {
              upcoming: {},
            },
          }
        )
        .accounts({
          signer: publicKey,
          selfProgram: program.programId,
          cpiSigner: PublicKey.findProgramAddressSync(
            [Buffer.from("cpi_authority")],
            program.programId
          )[0],
          vault: vaultPda,
          // misc
          systemProgram: SystemProgram.programId,
          accountCompressionAuthority,
          accountCompressionProgram,
          noopProgram,
          registeredProgramPda,
          lightSystemProgram: LightSystemProgram.programId,
        })
        .remainingAccounts(remainingAccounts)
        .instruction();

      const blockhash = await rpc.getLatestBlockhash();

      const tx = buildTx(
        [setComputeUnitLimitIx, setComputeUnitPriceIx, ix],
        publicKey,
        blockhash.blockhash
      );

      console.log("txSize:", tx.serialize().byteLength);

      const signedTx = await signTransaction(tx);

      const txSig = await rpc.sendTransaction(signedTx);

      await rpc.confirmTransaction({
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        signature: txSig,
      });

      console.log("txSig", txSig);

      toast({ title: "success", description: "hehehe" });
    } catch (error) {}
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-screen-lg w-full mx-auto px-4 sm:px-6 md:gap-8 my-10"
      >
        <div className="w-full flex items-center gap-4 mb-10">
          <Link href="/dashboard" replace>
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            New Campaign
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href="/dashboard" replace>
              <Button variant="outline" size="sm">
                Discard
              </Button>
            </Link>
            <Button type="submit" size="sm">
              Save Campaign
            </Button>
          </div>
        </div>

        <Card x-chunk="A card with a form to edit the product details">
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter campaign name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (SOL)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter amount of budget"
                      type="number"
                      min={0}
                      {...field}
                      // onChange={(event) => field.onChange(+event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ratePerClick"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate per click</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter rate per click"
                      {...field}
                      // onChange={(event) => field.onChange(+event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ctaLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CTA Link</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter CTA Link" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col">
                    <FormLabel>Start date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col">
                    <FormLabel>End date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 md:hidden">
          <Button variant="outline" size="sm">
            Discard
          </Button>
          <Button size="sm">Save Product</Button>
        </div>
      </form>
    </Form>
  );
}
