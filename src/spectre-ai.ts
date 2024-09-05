import { BigInt, store } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/spectre-ai/spectre_ai";
import { HolderSnapshot, TokenHolder, TotalHolderCount } from "../generated/schema";

export function handleTransfer(event: Transfer): void {
  let fromAddress = event.params.from.toHex();
  let toAddress = event.params.to.toHex();
  let value = event.params.value;

  if (value.isZero()) return;

  // Load or initialize the TotalHolderCount entity
  let totalHolderCount = TotalHolderCount.load("total");
  if (!totalHolderCount) {
    totalHolderCount = new TotalHolderCount("total");
    totalHolderCount.holderCount = 0;
  }

  // Handle the receiver
  if (toAddress != "0x0000000000000000000000000000000000000000") {
    let toHolder = TokenHolder.load(toAddress);
    if (!toHolder) {
      toHolder = new TokenHolder(toAddress);
      toHolder.balance = BigInt.fromI32(0);
      totalHolderCount.holderCount += 1; // Increment holder count
    }
    toHolder.balance = toHolder.balance.plus(value);
    toHolder.save();
  }

  // Handle the sender
  if (fromAddress != "0x0000000000000000000000000000000000000000") {
    let fromHolder = TokenHolder.load(fromAddress);
    if (fromHolder) {
      fromHolder.balance = fromHolder.balance.minus(value);
      if (fromHolder.balance.isZero()) {
        store.remove("TokenHolder", fromAddress); // Remove holder if balance is zero
        totalHolderCount.holderCount -= 1; // Decrement holder count
      } else {
        fromHolder.save();
      }
    }
  }

  // Save the updated total holder count
  totalHolderCount.save();

  // Calculate daily timestamp (start of the day)
  let currentTimestamp = event.block.timestamp;
  let secondsInDay = BigInt.fromI32(86400); // 24 * 60 * 60
  let dayTimestamp = currentTimestamp.div(secondsInDay).times(secondsInDay); // Truncate to start of the day

  // Create or update a snapshot for the day
  let snapshotId = dayTimestamp.toString();
  let snapshot = HolderSnapshot.load(snapshotId);
  if (!snapshot) {
    snapshot = new HolderSnapshot(snapshotId);
    snapshot.timestamp = dayTimestamp;
    snapshot.holderCount = totalHolderCount.holderCount; // Use the maintained holder count
    snapshot.save();
  }
}
