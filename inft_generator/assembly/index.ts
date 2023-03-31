import {
  Address,
  Bytes,
  util,
  allocate as _allocate,
  models,
  encodeString,
  Host,
  Context,
  base64,
  Balance,
} from "idena-sdk-as"
import { Protobuf } from 'as-proto';
import { JSON } from "idena-assemblyscript-json";

const IDNA_DECIMALS = Balance.fromString("1000000000000000000");

@idenaBindgenIgnore // cut compile time in half with this one weird trick
export function generateArt(identityData: i32, identityAddress: i32): i32 {
  let obj: JSON.Obj = new JSON.Obj()

  const identityDataBytes = util.ptrToBytes(identityData).toBytes()
  const identityAddress_ = Address.fromBytes(util.ptrToBytes(identityAddress).toBytes())
  const identity = Protobuf.decode<models.ProtoStateIdentity>(identityDataBytes, models.ProtoStateIdentity.decode);

  const art = generateSVG(identityAddress_, identity.state, identity.birthday, Bytes.fromBytes(identity.stake), Context.epoch())
  const attributesArray = new JSON.Arr()
  fillAttributes(attributesArray, identityAddress_, identity.state, identity.birthday, Bytes.fromBytes(identity.stake), Context.epoch())

  obj.set("image", "data:image/svg+xml;base64," + base64.encode(encodeString(art)))
  obj.set("attributes", attributesArray)
  return util.bytesToPtr(encodeString(obj.toString()))
}

function fillAttributes(attributesArray: JSON.Arr, address: Address, state: u32, birthday: u32, stake: Bytes, epoch: u32): void {
  const random = _random(address, epoch)
  const stateString = stateToString(state)
  const age = epoch - birthday
  const rare = random[18] > 222
  let stakeNumber = Balance.fromBytes(stake)
  stakeNumber = stakeNumber / IDNA_DECIMALS;
  const stakeNumberString = formatLargeNumber(stakeNumber)

  const ageAttribute = new JSON.Obj();
  ageAttribute.set("trait_type", "Age")
  ageAttribute.set("value", age.toString())
  attributesArray.push(ageAttribute)
  const stateAttribute = new JSON.Obj();
  stateAttribute.set("trait_type", "State")
  stateAttribute.set("value", stateString)
  attributesArray.push(stateAttribute)
  const stakeAttribute = new JSON.Obj();
  stakeAttribute.set("trait_type", "Stake")
  stakeAttribute.set("value", stakeNumberString)
  attributesArray.push(stakeAttribute)
  if (rare) {
    const rareAttribute = new JSON.Obj();
    rareAttribute.set("trait_type", "Rare")
    rareAttribute.set("value", "true")
    attributesArray.push(rareAttribute)
  }
}

function generateSVG(address: Address, state: u32, birthday: u32, stake: Bytes, epoch: u32): string {
  const random = _random(address, epoch)
  Host.emitEvent("Random", [random])
  const addressString = `0x${address.toString()}`
  const stateString = stateToString(state)
  const age = epoch - birthday
  const color0 = bytesToColorHex(random, 0)
  const color1 = bytesToColorHex(random, 3)
  const color2 = bytesToColorHex(random, 6)
  const color3 = bytesToColorHex(random, 9)
  const x1 = scale(random[12], 0, 255, 16, 274)
  const y1 = scale(random[13], 0, 255, 100, 484)
  const x2 = scale(random[14], 0, 255, 16, 274)
  const y2 = scale(random[15], 0, 255, 100, 484)
  const x3 = scale(random[16], 0, 255, 16, 274)
  const y3 = scale(random[17], 0, 255, 100, 484)
  const rare = random[18] > 222

  // generate defs
  let svg = `<svg width="290" height="500" viewBox="0 0 290 500" xmlns="http://www.w3.org/2000/svg" xmlns:xlink='http://www.w3.org/1999/xlink'><defs><filter id="f1"><feImage result="p0" xlink:href="data:image/svg+xml;base64,`
  svg += base64.encode(encodeString("<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><rect width='290px' height='500px' fill='#" + color0 + "'/></svg>"))
  svg += '"/><feImage result="p1" xlink:href="data:image/svg+xml;base64,'
  svg += base64.encode(encodeString("<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><circle cx='" + x1.toString() + "' cy='" + y1.toString() + "' r='120px' fill='#" + color1 + "'/></svg>"))
  svg += '"/><feImage result="p2" xlink:href="data:image/svg+xml;base64,'
  svg += base64.encode(encodeString("<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><circle cx='" + x2.toString() + "' cy='" + y2.toString() + "' r='120px' fill='#" + color2 + "'/></svg>"))
  svg += '"/><feImage result="p3" xlink:href="data:image/svg+xml;base64,'
  svg += base64.encode(encodeString("<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg'><circle cx='" + x3.toString() + "' cy='" + y3.toString() + "' r='100px' fill='#" + color3 + "'/></svg>"))
  svg += '" /><feBlend mode="overlay" in="p0" in2="p1" /><feBlend mode="exclusion" in2="p2" /><feBlend mode="overlay" in2="p3" result="blendOut" /><feGaussianBlur ' +
  'in="blendOut" stdDeviation="42" /></filter> <clipPath id="corners"><rect width="290" height="500" rx="42" ry="42" /></clipPath>' +
  '<path id="text-path-a" d="M40 12 H250 A28 28 0 0 1 278 40 V460 A28 28 0 0 1 250 488 H40 A28 28 0 0 1 12 460 V40 A28 28 0 0 1 40 12 z" />' +
  '<path id="minimap" d="M234 444C234 457.949 242.21 463 253 463" />' +
  '<filter id="top-region-blur"><feGaussianBlur in="SourceGraphic" stdDeviation="24" /></filter>' +
  '<linearGradient id="grad-down" x1="0" x2="1" y1="0" y2="1"><stop offset="0.0" stop-color="white" stop-opacity="0.65" /><stop offset="0.8" stop-color="white" stop-opacity="0" /></linearGradient>' +
  '<mask id="fade-down" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#grad-down)" /></mask>' +
  '<mask id="none" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="white" /></mask>' +
  '<linearGradient id="grad-symbol"><stop offset="0.7" stop-color="white" stop-opacity="1" /><stop offset=".95" stop-color="white" stop-opacity="0" /></linearGradient>' +
  '<mask id="fade-symbol" maskContentUnits="userSpaceOnUse"><rect width="290px" height="200px" fill="url(#grad-symbol)" /></mask></defs>' +
  '<g clip-path="url(#corners)">' +
  '<rect fill="' + color0 +
  '" x="0px" y="0px" width="290px" height="500px" />' +
  '<rect style="filter: url(#f1)" x="0px" y="0px" width="290px" height="500px" />' +
  ' <g style="filter:url(#top-region-blur); transform:scale(1.5); transform-origin:center top;">' +
  '<rect fill="none" x="0px" y="0px" width="290px" height="500px" />' +
  '<ellipse cx="50%" cy="0px" rx="180px" ry="120px" fill="#000" opacity="0.85" /></g>' +
  '<rect x="0" y="0" width="290" height="500" rx="42" ry="42" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" /></g>'

  // generate border text
  svg += '<text text-rendering="optimizeSpeed">' +
  '<textPath startOffset="-100%" fill="white" font-family="\'Courier New\', monospace" font-size="10px" xlink:href="#text-path-a">' +
  addressString + ' • ' + stateString +
  ' <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" />' +
  '</textPath> <textPath startOffset="0%" fill="white" font-family="\'Courier New\', monospace" font-size="10px" xlink:href="#text-path-a">' +
  addressString + ' • ' + stateString +
  ' <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" /> </textPath>' +
  '<textPath startOffset="50%" fill="white" font-family="\'Courier New\', monospace" font-size="10px" xlink:href="#text-path-a">' +
  addressString + ' • ' + stateString +
  ' <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s"' +
  ' repeatCount="indefinite" /></textPath><textPath startOffset="-50%" fill="white" font-family="\'Courier New\', monospace" font-size="10px" xlink:href="#text-path-a">' +
  addressString + ' • ' + stateString +
  ' <animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" /></textPath></text>'

  // generate card mantle
  svg += '<g mask="url(#fade-symbol)"><rect fill="none" x="0px" y="0px" width="290px" height="200px" /> <text y="70px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-weight="200" font-size="36px">' +
  stateString +
  '</text><text y="115px" x="32px" fill="white" font-family="\'Courier New\', monospace" font-weight="200" font-size="36px">' +
  'Age: ' + age.toString() +
  '</text></g>' +
  '<rect x="16" y="16" width="258" height="468" rx="26" ry="26" fill="rgba(0,0,0,0)" stroke="rgba(255,255,255,0.2)" />'

  // add idena logo
  svg += '<g mask="url(#fade-down)" style="transform:translate(-110px,0px)" fill="#' + color0 + '">' +
  '<path d="m255.8875,304.77498c-10.4,0 -16,-6 -18.4,-9.2a196,196 0 0 1 12,-5.6c0.8,0 1.6,0 2.8,0.8l3.2,0.8a2.8,2.8 0 0 0 0.4,0c0.8,0 2.4,0 3.2,-0.8c1.2,-0.8 2.4,-1.2 2.8,-0.8l12,5.6c-2,3.2 -8,9.2 -18,9.2m24,-12.4c-4,-2.8 -13.6,-6.8 -16,-8c-2,-0.8 -4.8,0 -7.6,1.2a2.4,2.4 0 0 1 -0.4,0a2.4,2.4 0 0 1 -0.8,0c-2.8,-1.6 -5.2,-2 -7.6,-0.8c-2,0.8 -12,4.8 -16,7.6a2.8,2.8 0 0 0 -0.8,3.6a28,28 0 0 0 25.2,14.4a28,28 0 0 0 24.8,-14.4a2.8,2.8 0 0 0 -0.8,-4m15.2,-55.6l-17.6,0a10.4,10.4 0 0 1 10.4,-9.6l17.6,0a10.4,10.4 0 0 1 -10.4,9.6m13.6,-15.2l-20.8,0a16,16 0 0 0 -16,16l0,2c0,1.6 1.2,2.8 2.8,2.8l20.4,0a16,16 0 0 0 16,-16l0,-2.4a2.8,2.8 0 0 0 -2.4,-2.8m-92,15.2a10.4,10.4 0 0 1 -10.8,-9.6l18,0a10.4,10.4 0 0 1 10.8,9.6l-18.8,0l0.8,0zm23.2,2.8l0,-2a16,16 0 0 0 -16,-16l-20.8,0a2.8,2.8 0 0 0 -2.8,2.8l0,2a16,16 0 0 0 16,16l20.8,0c1.6,0 2.8,-1.2 2.8,-2.8zm24,75.6l-18,0a2.8,2.8 0 1 0 0,5.6l18,0a2.8,2.8 0 1 0 0,-5.6"/>' +
  '<path d="m246.325,268.07499c0,1.6 1.2,2.8 2.8,2.8l12.8,0a2.8,2.8 0 1 0 0,-6l-12.8,0a2.8,2.8 0 0 0 -2.8,3.2"/>' +
  '<path d="m351.2,250.8l-12.8,-14.8c-3.2,-3.6 -3.2,-9.2 0,-12.8l1.2,-1.6l16,18.4c0.8,5.2 1.2,10.4 1.2,16l0,1.2l-5.6,-6.4zm2.8,28l-2.8,-4l-12.8,-14.4c-3.2,-3.6 -3.2,-9.2 0,-12.8l1.2,-1.6l16.8,19.6a100.4,100.4 0 0 1 -2.4,13.2zm-5.6,17.2l-6.8,-8l-3.2,-4c-3.2,-3.2 -3.2,-8.8 0,-12l1.2,-2l12.8,14.8a100,100 0 0 1 -4,11.2zm-8,14.8a16.4,16.4 0 0 1 -0.8,-16l6,6.8l-5.2,9.2zm-16.8,19.6l0,-149.2a101.6,101.6 0 0 1 12,12.4l-1.6,1.6a16,16 0 0 0 0,20l2,2.4l-2,2a16,16 0 0 0 0,20l2,2.4l-2,2a16,16 0 0 0 0,20l2,2.4l-2,2a16,16 0 0 0 0,20l2,2a22,22 0 0 0 0,24.8a2.8,2.8 0 0 0 0.8,0.8a101.6,101.6 0 0 1 -13.2,14.8l0,-0.4zm-6,-146l0,2.8a91.2,91.2 0 0 0 -123.2,0a24.8,24.8 0 0 1 0,-2.8l0,-8a100.4,100.4 0 0 1 61.6,-21.2a100,100 0 0 1 61.6,21.2l0,8.4l0,-0.4zm-89.6,-10a86.4,86.4 0 0 1 28,-4.8c9.6,0 18.8,1.6 28,4.8c-8,7.2 -18,11.2 -28,11.2s-20,-4 -28,-11.2zm89.6,61.6l0,0.4c0,12.4 -6.8,24.8 -18.8,33.6a2.8,2.8 0 1 0 3.6,4.4c6.4,-4.8 12,-10.4 15.2,-16.8c0,18.8 -7.2,36.8 -20,50.8l-20.8,22a28.8,28.8 0 0 1 -20.8,9.2a28.8,28.8 0 0 1 -21.2,-9.2l-20.4,-22a74,74 0 0 1 -20,-50.8c3.2,6.4 8.4,12 15.2,16.8a2.8,2.8 0 0 0 4,-0.4a2.8,2.8 0 0 0 -0.8,-4c-12,-8.8 -18.8,-21.2 -18.8,-33.6l0,-33.6a30.4,30.4 0 0 0 24.8,12.8l4,0a23.2,23.2 0 0 1 23.2,22.8l0,28a2.8,2.8 0 1 0 5.6,0l0,-28c0,-16 -12.8,-28.8 -28.8,-28.8l-4,0a24.8,24.8 0 0 1 -22.8,-15.6a86,86 0 0 1 26.4,-17.6a48,48 0 0 0 33.6,15.6c12,0 24,-5.6 33.6,-15.2a86,86 0 0 1 26.4,17.6a24.8,24.8 0 0 1 -23.2,16l-4,0c-16,0 -28.8,12.8 -28.8,28.4l0,28a2.8,2.8 0 1 0 5.6,0l0,-28a23.2,23.2 0 0 1 23.2,-22.8l4,0a30.4,30.4 0 0 0 24.8,-12.8l0,32.8zm0,99.6l-4.4,3.2l0,-41.6a79.2,79.2 0 0 0 4.4,-10l0,48l0,0.4zm-10.4,7.2l-4.8,2.8l0,-34l4.8,-6l0,37.2zm-10.8,5.2l-5.2,2l0,-27.2l5.2,-5.2l0,30.4zm-10.8,4a100.8,100.8 0 0 1 -29.6,4c-10.4,0 -20.4,-1.2 -29.6,-4l0,-22.8l4.4,4.8a34.4,34.4 0 0 0 25.2,10.8a34.4,34.4 0 0 0 24.8,-10.8l4.8,-5.2l0,23.2zm-65.2,-2a100.4,100.4 0 0 1 -5.2,-2l0,-30.4l5.2,5.2l0,27.2zm-10.8,-4.8a100.8,100.8 0 0 1 -5.2,-2.8l0,-37.2l5.2,6.4l0,33.6zm-10.8,-48l0,41.6a100.8,100.8 0 0 1 -4.8,-4l0,-48c1.2,3.2 2.8,6.8 4.8,10l0,0.4zm-10.4,-61.2l0,94.8a101.6,101.6 0 0 1 -13.6,-14.8a2.8,2.8 0 0 0 0.8,-0.8a22,22 0 0 0 0,-24.8l2,-2a16,16 0 0 0 0,-20l-1.6,-2l1.6,-2.4a16,16 0 0 0 0,-20l-1.6,-2l1.6,-2.4a16,16 0 0 0 0,-20l-1.6,-2l1.6,-2.4a16,16 0 0 0 0,-20l-1.2,-1.6a101.6,101.6 0 0 1 12,-12.4l0,54.8zm-16.8,75.2a100.8,100.8 0 0 1 -5.6,-9.2l3.2,-4l2.8,-2.8a16,16 0 0 1 -0.4,16zm-12,-26l12.4,-14.8l1.6,1.6c2.8,3.6 2.8,9.2 0,12.8l-3.6,4l-6,7.2a100,100 0 0 1 -4,-11.2l-0.4,0.4zm-4,-20l16.4,-18.8l1.6,1.6c2.8,3.6 2.8,9.2 0,12.8l-3.6,4l-5.2,6l-4,4.8l-3.2,3.6a100.8,100.8 0 0 1 -2,-13.2l0,-0.8zm-0.4,-9.2c0,-5.6 0,-10.8 1.2,-16l16,-18.4l1.2,1.6c2.8,3.6 2.8,9.2 0,12.8l-3.6,4l-14.8,17.2l0,-1.2zm18,-57.6l0,0.4c3.2,3.6 3.2,9.2 0,12.8l-9.2,11.2l-4.8,5.6a100.4,100.4 0 0 1 14.4,-30l-0.4,0zm165.2,0.4l0,-0.4a100.4,100.4 0 0 1 14.4,30l-1.6,-2l-12.8,-14.8c-3.2,-3.6 -3.2,-9.2 0,-12.8zm-82.4,-49.2a106.4,106.4 0 1 0 0,212.8a106.4,106.4 0 0 0 0,-212.8z"/></g>'

  // generate identity data
  let stakeNumber = Balance.fromBytes(stake)
  stakeNumber = stakeNumber / IDNA_DECIMALS;
  const stakeNumberString = formatLargeNumber(stakeNumber)
  const epochString = epoch.toString()
  const str1length = epochString.length + 7
  const str2length = stakeNumberString.length + 7

  svg += ' <g style="transform:translate(29px, 414px)">' +
  '<rect width="' +
  (7 * (str1length + 4)).toString() +
  'px" height="26px" rx="8px" ry="8px" fill="rgba(0,0,0,0.6)" />' +
  '<text x="12px" y="17px" font-family="\'Courier New\', monospace" font-size="12px" fill="white"><tspan fill="rgba(255,255,255,0.6)">Epoch: </tspan>' +
  epochString +
  '</text></g>' +
  ' <g style="transform:translate(29px, 444px)">' +
  '<rect width="' +
  (7 * (str2length + 4)).toString() +
  'px" height="26px" rx="8px" ry="8px" fill="rgba(0,0,0,0.6)" />' +
  '<text x="12px" y="17px" font-family="\'Courier New\', monospace" font-size="12px" fill="white"><tspan fill="rgba(255,255,255,0.6)">Stake: </tspan>' +
  stakeNumberString +
  '</text></g>'

  if (rare) {
    svg += '<g style="transform:translate(226px, 433px)"><rect width="36px" height="36px" rx="8px" ry="8px" fill="none" stroke="rgba(255,255,255,0.2)" />' +
    '<g><path style="transform:translate(6px,6px)" d="M12 0L12.6522 9.56587L18 1.6077L13.7819 10.2181L22.3923 6L14.4341 ' +
    '11.3478L24 12L14.4341 12.6522L22.3923 18L13.7819 13.7819L18 22.3923L12.6522 14.4341L12 24L11.3478 14.4341L6 22.39' +
    '23L10.2181 13.7819L1.6077 18L9.56587 12.6522L0 12L9.56587 11.3478L1.6077 6L10.2181 10.2181L6 1.6077L11.3478 9.56587L12 0Z" fill="white" />' +
    '<animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="10s" repeatCount="indefinite"/></g></g>'
  }
  svg += '</svg>'
  return svg
}

function _random(identityAddress: Address, epoch: u32): Bytes {
  const addressBytes = identityAddress.toBytes()
  const epochBytes = Bytes.fromU32(epoch)
  const seed = new Bytes(addressBytes.length + epochBytes.length)
  seed.set(addressBytes, 0)
  seed.set(epochBytes, addressBytes.length)
  Host.emitEvent("RandomSeed", [seed])
  return Host.keccac256(Host.keccac256(seed))
}

function bytesToColorHex(bytes: Bytes, offset: i32): string {
  const slice = bytes.slice(offset, offset + 3)
  const sliceBytes = Bytes.fromBytes(slice)
  return sliceBytes.toHex().padStart(6, "0")
}

function stateToString(state: u32): string {
  let s: string;
  switch (state)  {
    case 1:
      s = "Invite"
      break;
    case 2:
      s = "Candidate"
      break;
    case 3:
      s = "Verified"
      break;
    case 4:
      s = "Suspended"
      break;
    case 5:
      s = "Killed"
      break;
    case 6:
      s = "Zombie"
      break;
    case 7:
      s = "Newbie"
      break;
    case 8:
      s = "Human"
      break;
    default:
      s = "Undefined"
      break;
    }
  return s;
}

export function formatLargeNumber(n: Balance) : string {
  let suffix: string = "";
  let resultNumber: Balance = n;

  if (n >= Balance.from(1_000_000)) {
    suffix = "M";
    resultNumber = n / Balance.from(1_000_000);
  } else if (n >= Balance.from(1_000)) {
    suffix = "K";
    resultNumber = n / Balance.from(1_000);
  }

  let formattedNum: string = resultNumber.toString();
  return formattedNum + suffix;
}

function scale(n: u64, inMn: u64, inMx: u64, outMn: u64, outMx: u64): string {
  return ((n - inMn) * (outMx - outMn) / (inMx - inMn) + outMn).toString();
}

export function deploy(): void {}

@idenaBindgenIgnore
export function allocate(size: u32): usize {
  return _allocate(size)
}
