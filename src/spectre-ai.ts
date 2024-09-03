import { BigInt } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/spectre-ai/spectre_ai";
import { Holder } from "../generated/schema";

// Handle Transfer events
export function handleTransfer(event: Transfer): void {
  // Load or create the holder entity for the sender
  let fromHolder = Holder.load(event.params.from.toHex());
  if (fromHolder == null) {
    fromHolder = new Holder(event.params.from.toHex());
    fromHolder.address = event.params.from;
    fromHolder.balance = BigInt.fromI32(0);
  }

  // Load or create the holder entity for the receiver
  let toHolder = Holder.load(event.params.to.toHex());
  if (toHolder == null) {
    toHolder = new Holder(event.params.to.toHex());
    toHolder.address = event.params.to;
    toHolder.balance = BigInt.fromI32(0);
  }

  // Update balances
  fromHolder.balance = fromHolder.balance.minus(event.params.value);
  toHolder.balance = toHolder.balance.plus(event.params.value);

  // Save the updated entities
  fromHolder.save();
  toHolder.save();
}
