import { BigInt, store } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/templates/TokenTemplate/ERC20";
import { HolderSnapshot, TokenHolder, TotalHolderCount } from "../generated/schema";

export function handleTransfer(event: Transfer): void {
  let fromAddress = event.params.from.toHex();
  let toAddress = event.params.to.toHex();
  let value = event.params.value;
  let tokenAddress = event.address; // Address of the token

  if (value.isZero()) return;

  // Load or initialize the TotalHolderCount entity for the specific token
  let totalHolderCount = TotalHolderCount.load(tokenAddress.toHex());
  if (!totalHolderCount) {
    totalHolderCount = new TotalHolderCount(tokenAddress.toHex());
    totalHolderCount.tokenAddress = tokenAddress;
    totalHolderCount.holderCount = 0;
  }

  // Handle the receiver
  if (toAddress != "0x0000000000000000000000000000000000000000") {
    let toHolderId = tokenAddress.toHex() + '-' + toAddress; // Unique by token and address
    let toHolder = TokenHolder.load(toHolderId);
    if (!toHolder) {
      toHolder = new TokenHolder(toHolderId);
      toHolder.tokenAddress = tokenAddress;
      toHolder.balance = BigInt.fromI32(0);
      totalHolderCount.holderCount += 1; // Increment holder count
    }
    toHolder.balance = toHolder.balance.plus(value);
    toHolder.save();
  }

  // Handle the sender
  if (fromAddress != "0x0000000000000000000000000000000000000000") {
    let fromHolderId = tokenAddress.toHex() + '-' + fromAddress; // Unique by token and address
    let fromHolder = TokenHolder.load(fromHolderId);
    if (fromHolder) {
      fromHolder.balance = fromHolder.balance.minus(value);
      if (fromHolder.balance.isZero()) {
        store.remove("TokenHolder", fromHolderId); // Remove holder if balance is zero
        totalHolderCount.holderCount -= 1; // Decrement holder count
      } else {
        fromHolder.save();
      }
    }
  }

  // Save the updated total holder count for the token
  totalHolderCount.save();

  // Calculate daily timestamp (start of the day)
  let currentTimestamp = event.block.timestamp;
  let secondsInDay = BigInt.fromI32(86400);
  let dayTimestamp = currentTimestamp.div(secondsInDay).times(secondsInDay);

  // Create or update a snapshot for the specific token and day
  let snapshotId = tokenAddress.toHex() + '-' + dayTimestamp.toString(); // Unique by token and timestamp
  let snapshot = HolderSnapshot.load(snapshotId);
  if (!snapshot) {
    snapshot = new HolderSnapshot(snapshotId);
    snapshot.tokenAddress = tokenAddress;
    snapshot.timestamp = dayTimestamp;
    snapshot.holderCount = totalHolderCount.holderCount; // Use the maintained holder count
    snapshot.save();
  }
}
