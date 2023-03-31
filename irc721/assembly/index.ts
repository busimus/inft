import {
  Address,
  Bytes,
  Balance,
  Context,
  PersistentMap,
  util,
  Host,
  decodeAddress,
  models,
} from "idena-sdk-as"
import { Protobuf } from 'as-proto';

import { JSON } from "idena-assemblyscript-json";

const ZERO_ADDRESS: Address = Address.fromBytes(new Uint8Array(20))
const ZERO_TOKEN: u64 = 0

// Mostly compatible with ERC721 (with Metadata and Enumerable extensions), but with some differences:
// - u64 instead of u256 for tokenIds (u256 is a pain to use right now and not needed for this project)
// - No baseURI, also because not needed
// - No global iteration that ERC721Enumerable supports
export class IRC721 {

  _name: string
  _symbol: string
  _totalSupply: u64
  owners: PersistentMap<u64, Address>
  balances: PersistentMap<Address, u64>
  tokenApprovals: PersistentMap<u64, Address>
  operatorApprovals: PersistentMap<string, bool>

  // Non-ERC721 fields
  _tokenURIs: PersistentMap<u64, Bytes>
  _lastTokenId: u64
  _defaultGenerator: Address
  _approvedGenerators: PersistentMap<Address, bool>
  _mintedBy: PersistentMap<Address, u64>
  _ownedBy: PersistentMap<string, u64>
  _ownedTokensIndex: PersistentMap<u64, u64>
  _owner: Address

  // this is probably not how this should be done at all
  _identityCallbackGas: u32 = 450000000
  _generateGas: u32 = 200000000
  _mintGas: u32 = 200000000

  constructor(name: string, symbol: string) {
    this._name = name;
    this._symbol = symbol;
    this._totalSupply = 0
    this.owners = PersistentMap.withStringPrefix<u64, Address>("ow:");
    this.balances = PersistentMap.withStringPrefix<Address, u64>("ba:");
    this.tokenApprovals = PersistentMap.withStringPrefix<u64, Address>("ap:");
    this.operatorApprovals = PersistentMap.withStringPrefix<string, bool>("op:");
    this._tokenURIs = PersistentMap.withStringPrefix<u64, Bytes>("ur:");

    this._lastTokenId = 0
    this._defaultGenerator = ZERO_ADDRESS
    this._approvedGenerators = PersistentMap.withStringPrefix<Address, bool>("ag:")

    this._mintedBy = PersistentMap.withStringPrefix<Address, u64>("mi:")
    this._ownedBy = PersistentMap.withStringPrefix<string, u64>("ob:")
    this._ownedTokensIndex = PersistentMap.withStringPrefix<u64, u64>("oi:")
    this._owner = Context.caller()
  }

  @view
  balanceOf(owner: Address): Balance {
    util.assert(owner != ZERO_ADDRESS, "Address zero is not a valid owner")
    return Balance.from(this.balances.get(owner, 0))
  }

  @view
  totalSupply(): u64 {
    return this._totalSupply
  }

  @view
  ownerOf(tokenId: u64): Address {
    const owner = this.owners.get(tokenId, ZERO_ADDRESS)
    util.assert(owner != ZERO_ADDRESS, "Invalid token ID")
    return owner
  }

  // Get the token ID that was minted by the given identity
  @view
  mintedBy(minter: Address): u64 {
    util.assert(minter != ZERO_ADDRESS, "Address zero is not a valid minter")
    return this._mintedBy.get(minter, ZERO_TOKEN)
  }

  @view
  tokenOfOwnerByIndex(owner: Address, index: u64): u64 {
    util.assert(index < this.balances.get(owner, 0), "Owner index out of bounds")
    const key = owner.toHex() + ":" + index.toString()
    return this._ownedBy.get(key, ZERO_TOKEN)
  }

  @view
  name(): string {
    return this._name
  }

  @view
  symbol(): string {
    return this._symbol
  }

  @view
  tokenURI(tokenId: u64): Bytes {
    this._requireMinted(tokenId)
    return this._tokenURIs.get(tokenId, Bytes.fromString(""))
  }

  approve(to: Address, tokenId: u64): void {
    const sender = Context.caller()
    const owner = this.ownerOf(tokenId)
    util.assert(to != owner, "Approval to current owner")
    util.assert(sender == owner || this.isApprovedForAll(owner, sender), "Approve caller is not token owner or approved for all")
    this.tokenApprovals.set(tokenId, to)
    Host.emitEvent("Approval", [owner, to, Bytes.fromU64(tokenId)])
  }

  @view
  getApproved(tokenId: u64): Address {
    this._requireMinted(tokenId)
    return this.tokenApprovals.get(tokenId, ZERO_ADDRESS)
  }

  setApprovalForAll(operator: Address, approved: bool): void {
    const owner = Context.caller()
    util.assert(owner != operator, "Approve to caller")
    const key = owner.toHex() + ":" + operator.toHex()
    if (approved) {
      this.operatorApprovals.set(key, approved)
    } else {
      this.operatorApprovals.delete(key)
    }
    Host.emitEvent("ApprovalForAll", [owner, operator, Bytes.fromU8(approved === true ? 1 : 0) ])
  }

  @view
  isApprovedForAll(owner: Address, operator: Address): bool {
    const key = owner.toHex() + ":" + operator.toHex()
    return this.operatorApprovals.get(key, false)
  }

  transferFrom(from: Address, to: Address, tokenId: u64): void {
    const caller = Context.caller()
    util.assert(this._isApprovedOrOwner(caller, tokenId), "Caller is not token owner or approved")
    util.assert(to != ZERO_ADDRESS, "Transfer to the zero address")

    this._removeTokenFromOwnerEnumeration(from, tokenId)
    this.tokenApprovals.delete(tokenId)
    // Can't underflow, must have at least one token
    this.balances.set(from, this.balances.get(from, 0) - 1)

    this._addTokenToOwnerEnumeration(to, tokenId)
    // Can't overflow, basically impossible to mint 2^64 tokens
    this.balances.set(to, this.balances.get(to, 0) + 1)

    this.owners.set(tokenId, to)
    Host.emitEvent("Transfer", [from, to, Bytes.fromU64(tokenId)])
  }

  @mutateState
  @privateMethod
  _mint(to: Address, tokenId: u64): void {
    util.assert(to != ZERO_ADDRESS, "Mint to the zero address")
    util.assert(!this._exists(tokenId), "Token already minted")

    this._addTokenToOwnerEnumeration(to, tokenId)
    // Will not overflow unless all 2**64 token ids are minted to the same owner.
    this.balances.set(to, this.balances.get(to, 0) + 1)
    this.owners.set(tokenId, to)
    this._totalSupply += 1
    Host.emitEvent("Transfer", [ZERO_ADDRESS, to, Bytes.fromU64(tokenId)])
  }

  @privateMethod
  _addTokenToOwnerEnumeration(owner: Address, tokenId: u64): void {
    const index = this.balances.get(owner, 0)
    const key = owner.toHex() + ":" + index.toString()
    this._ownedBy.set(key, tokenId)
    this._ownedTokensIndex.set(tokenId, index)
  }

  @mutateState
  burn(tokenId: u64): void {
    const caller = Context.caller()
    const owner = this.ownerOf(tokenId)
    util.assert(this._isApprovedOrOwner(caller, tokenId), "Caller is not token owner or approved")

    this._removeTokenFromOwnerEnumeration(owner, tokenId)
    this.balances.set(owner, this.balances.get(owner, 0) - 1)
    this.owners.set(tokenId, ZERO_ADDRESS)
    this.tokenApprovals.delete(tokenId)
    this._tokenURIs.delete(tokenId)
    this._totalSupply -= 1
    Host.emitEvent("Transfer", [owner, ZERO_ADDRESS, Bytes.fromU64(tokenId)])
  }

  @privateMethod
  _removeTokenFromOwnerEnumeration(owner: Address, tokenId: u64): void {
    const lastTokenIndex = this.balances.get(owner, 0) - 1
    const lastTokenKey = owner.toHex() + ":" + lastTokenIndex.toString()
    const deleteIndex = this._ownedTokensIndex.get(tokenId, 0)

    if (deleteIndex != lastTokenIndex) {
      const lastTokenId = this._ownedBy.get(lastTokenKey, ZERO_TOKEN)
      const deleteKey = owner.toHex() + ":" + deleteIndex.toString()
      this._ownedBy.set(deleteKey, lastTokenId)
      this._ownedTokensIndex.set(lastTokenId, deleteIndex)
    }

    this._ownedBy.delete(lastTokenKey)
    this._ownedTokensIndex.delete(tokenId)
  }

  @view
  _exists(tokenId: u64): bool {
    return this.owners.get(tokenId, ZERO_ADDRESS) != ZERO_ADDRESS
  }

  @view
  _isApprovedOrOwner(spender: Address, tokenId: u64): bool {
    const owner = this.ownerOf(tokenId)
    return (spender == owner || this.isApprovedForAll(owner, spender)) || this.getApproved(tokenId) == spender
  }

  @view
  _requireMinted(tokenId: u64): void {
    util.assert(this._exists(tokenId), "Invalid token ID")
  }

  @mutateState
  setApprovedGenerator(artContract: Address, approved: bool, set_default: bool): void {
    util.assert(Context.caller() == this._owner, "Only owner can approve generators")
    this._approvedGenerators.set(artContract, approved)
    if (set_default) {
      this._defaultGenerator = artContract;
    }
  }

  generate(artContract: Address): void {
    const caller = Context.caller()
    if (artContract == ZERO_ADDRESS) {
      artContract = this._defaultGenerator;
    } else {
      util.assert(this._approvedGenerators.get(artContract, false), "Art contract not approved")
    }
    util.assert(this.mintedBy(caller) == ZERO_TOKEN, "Caller already generated")
    Host.createGetIdentityPromise(caller, 200000).then("_generateIdentityCallback", [Bytes.fromU64(ZERO_TOKEN), artContract, caller], Balance.Zero, this._identityCallbackGas)
  }

  regenerate(tokenId: u64, artContract: Address): void {
    const caller = Context.caller()
    if (artContract == ZERO_ADDRESS) {
      artContract = this._defaultGenerator;
    } else {
      util.assert(this._approvedGenerators.get(artContract, false), "Art contract not approved")
    }

    util.assert(this._isApprovedOrOwner(caller, tokenId), "Caller is not token owner or approved")

    // Get the identity of the original minter from tokenURI
    const tokenUri = this.tokenURI(tokenId)
    const token: JSON.Obj = <JSON.Obj>(JSON.parse(tokenUri));
    const identity = token.getString("identity")
    let originalMinter = ZERO_ADDRESS
    if (identity != null) {
      originalMinter = decodeAddress(Address.fromBytes(util.decodeFromHex(identity.valueOf().toString())))
    } else {
      util.assert(identity != null, "Token has no identity") // should never happen
    }
    Host.createGetIdentityPromise(originalMinter, 200000).then("_generateIdentityCallback", [Bytes.fromU64(tokenId), artContract, originalMinter], Balance.Zero, this._identityCallbackGas)
  }

  _generateIdentityCallback(tokenId: u64, artContract: Address, identityAddress: Address): void {
    const receiver = Context.originalCaller()
    let identData = Host.promiseResult().value()
    Host.emitEvent("IdentityData", [identData])
    util.assert(Host.promiseResult().failed() === false, 'Failed to get identity')  // TODO: comment out for testing
    const identity = Protobuf.decode<models.ProtoStateIdentity>(identData, models.ProtoStateIdentity.decode);
    util.assert(identity.state == 3 || identity.state == 7 || identity.state == 8, "Not validated identity")

    Host.createCallFunctionPromise(artContract, "generateArt", [identData, receiver], Balance.Zero, this._generateGas)
    .then("_mintGeneratedToken", [Bytes.fromU64(tokenId), receiver, artContract, identityAddress], Balance.Zero, this._mintGas);
  }

  @mutateState
  _mintGeneratedToken(tokenId: u64, receiver: Address, artContract: Address, identityAddress: Address): u64 {
    util.assert(Host.promiseResult().failed() === false, 'Failed to generate art')
    let tokenUri = Host.promiseResult().value()

    if (tokenId == ZERO_TOKEN) { // if not regenerating
      tokenId = this._mintedBy.get(receiver, ZERO_TOKEN);
      if (tokenId == ZERO_TOKEN) {
        tokenId = this._lastTokenId + 1
        this._mint(receiver, tokenId)
        this._lastTokenId = tokenId
        this._mintedBy.set(receiver, tokenId)
      }
    }

    let token: JSON.Obj = <JSON.Obj>(JSON.parse(tokenUri));
    token.set("name", `${this._name} #${tokenId.toString()}`);
    token.set("identity", `0x${identityAddress.toString()}`);
    token.set("tokenId", tokenId.toString());
    token.set("generatedEpoch", Context.epoch().toString());
    token.set("artContract", `0x${artContract.toString()}`);

    tokenUri = Bytes.fromString(token.stringify());
    this._tokenURIs.set(tokenId, tokenUri)
    Host.emitEvent("GeneratedArt", [receiver, Bytes.fromU64(tokenId)])
    return tokenId
  }

  @mutateState
  setGas(identityCallbackGas: u32, generateGas: u32, mintGas: u32): void {
    util.assert(Context.caller() == this._owner, "Only owner can set gas")
    this._identityCallbackGas = identityCallbackGas
    this._generateGas = generateGas
    this._mintGas = mintGas
  }

  @mutateState
  transferOwnership(newOwner: Address): void {
    util.assert(Context.caller() == this._owner, "Only owner can transfer ownership")
    this._owner = newOwner
  }
}
