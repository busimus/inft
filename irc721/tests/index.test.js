const fs = require("fs")
const path = require("path")
const util = require("util")

const {
  ContractRunnerProvider,
  ContractArgumentFormat,
} = require("idena-sdk-tests")

const TOKEN_NAME = "iNFT"
const TOKEN_SYMBOL = "iNFT"

// WARNING: For now running tests requires modifying the contract runner source code to
// support multiple private keys to be used.
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const RANDOM_ADDRESS = "0x1234567890123456789012345678901234567890"
const ONE_ADDRESS = "0x111e1a4e851bf698949afc0c3280c36b2df150d8"
const TWO_ADDRESS = "0x222a3d05c4ffdd54c6f88ace2604d52f70f06107"
const THREE_ADDRESS = "0x333f94ac1d2f03b9c8ee5e24ede3bce7689a458e"
const FALSE_BOOL = '0x66616c7365'
const TRUE_BOOL = '0x74727565'

async function get_provider(deploy = false) {
  const provider = ContractRunnerProvider.create("http://127.0.0.1:3333", "")

  await provider.Chain.generateBlocks(1)
  await provider.Chain.resetTo(2)

  if (deploy) {
    const {inftContract, genContract} = await deploy_with(TOKEN_NAME, TOKEN_SYMBOL, provider)
    return {provider: provider, inftContract: inftContract}
  }
  return {provider: provider}
}

async function deploy_with(name, symbol, provider) {
  const wasm = path.join(".", "build", "release", "inft_irc721.wasm")
  const code = fs.readFileSync(wasm)

  await provider.Chain.generateBlocks(1)
  await provider.Chain.resetTo(2)

  const deployTx = await provider.Contract.deploy(
    "0",
    "9999",
    code,
    Buffer.from(""),
    [
      {
        index: 0,
        format: ContractArgumentFormat.String,
        value: name
      },
      {
        index: 1,
        format: ContractArgumentFormat.String,
        value: symbol
      },
    ]
  )
  await provider.Chain.generateBlocks(1)

  const deployReceipt = await provider.Chain.receipt(deployTx)
  console.log(util.inspect(deployReceipt, { showHidden: false, depth: null, colors: true }))
  expect(deployReceipt.success).toBe(true)
  const inftContract = deployReceipt.contract

  const wasmGen = path.join("..", "inft_generator", "build", "release", "inft_generator_1.0.wasm")
  const codeGen = fs.readFileSync(wasmGen)
  console.log(codeGen)

  const deployGenTx = await provider.Contract.deploy(
    "0",
    "9999",
    codeGen,
    Buffer.from(""),
  )
  await provider.Chain.generateBlocks(1)

  const deployGenReceipt = await provider.Chain.receipt(deployGenTx)
  console.log(util.inspect(deployGenReceipt, { showHidden: false, depth: null, colors: true }))
  expect(deployGenReceipt.success).toBe(true)
  const genContract = deployGenReceipt.contract

  const setArtContractTx = await provider.Contract.call(
    inftContract,
    "setApprovedGenerator",
    "0",
    "9999",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: deployGenReceipt.contract
      },
      {
        index: 1,
        format: ContractArgumentFormat.String,
        value: "true"
      },
      {
        index: 2,
        format: ContractArgumentFormat.String,
        value: "true"
      },
    ]
  )
  await provider.Chain.generateBlocks(1)

  const setArtContractReceipt = await provider.Chain.receipt(setArtContractTx)
  console.log(util.inspect(setArtContractReceipt, { showHidden: false, depth: null, colors: true }))
  expect(setArtContractReceipt.success).toBe(true)

  let rawState = await provider.Contract.readData(
    deployReceipt.contract,
    "STATE",
    "string"
  )
  const inftState = JSON.parse(rawState)
  console.log(inftState)
  expect(inftState).toHaveProperty('_name', TOKEN_NAME)
  expect(inftState).toHaveProperty('_symbol', TOKEN_SYMBOL)
  expect(inftState).toHaveProperty('_lastTokenId', '0')
  expect(Buffer.from(inftState._owner, "base64").toString("hex")).toBe((await provider.Chain.godAddress()).slice(2))
  expect(Buffer.from(inftState._defaultGenerator, "base64").toString("hex")).toBe(deployGenReceipt.contract.slice(2))
  return {inftContract, genContract}
}

async function estimate_output(contract, method, args, provider, success = true) {
  const receipt = await provider.Contract.estimateCall(
    contract,
    method,
    "0",
    "50000",
    args
  )
  console.log("estimate output:", receipt)
  expect(receipt.success).toBe(success)
  return receipt.actionResult.outputData
}
async function call_from(from, provider, contract, method, amount, maxFee, args = null) {
    return await provider.doRequest({
        method: 'contract_call',
        params: [
            {
                contract: contract,
                method: method,
                amount: amount,
                maxFee: maxFee,
                from: from,
                args: args,
            },
        ],
    });
}

it("can deploy and generate", async () => {
  const {provider} = await get_provider(false)
  const addr = ONE_ADDRESS

  let {inftContract, genContract} = await deploy_with(TOKEN_NAME, TOKEN_SYMBOL, provider)

  const genTx = await call_from(addr, provider,
    inftContract,
    "generate",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: genContract,
      },
      // {
      //   index: 1,
      //   format: ContractArgumentFormat.Int64,
      //   // random int
      //   value: Math.floor(Math.random() * 250).toString(),
      // },

    ]
  )

  await provider.Chain.generateBlocks(1)

  const genReceipt = await provider.Chain.receipt(genTx)
  console.log(genReceipt)
  for (var i = 0; i < (genReceipt.events || []).length; i++) {
    console.log(genReceipt.events[i])
  }
  for (var i = 0; i < (genReceipt.actionResult.subActionResults || []).length; i++) {
    console.log(genReceipt.actionResult.subActionResults[i])
    expect(genReceipt.actionResult.subActionResults[i].success).toBe(true)
    if (genReceipt.actionResult.subActionResults[i].subActionResults) {
      for (var j = 0; j < (genReceipt.actionResult.subActionResults[i].subActionResults || []).length; j++) {
        console.log(genReceipt.actionResult.subActionResults[i].subActionResults[j])
        expect(genReceipt.actionResult.subActionResults[i].subActionResults[j].success).toBe(true)
      }
    }
  }
  expect(genReceipt.success).toBe(true)
  const resultTokenId = genReceipt.actionResult.subActionResults[1].subActionResults[1].outputData
  // return;

  // Check that last token ID incremented
  let rawState = await provider.Contract.readData(
    inftContract,
    "STATE",
    "string"
  )
  let inftState = JSON.parse(rawState)
  console.log('STATE', inftState)
  expect(inftState).toHaveProperty('_identityCallbackGas', 450000000)
  expect(inftState).toHaveProperty('_generateGas', 200000000)
  expect(inftState).toHaveProperty('_mintGas', 200000000)
  expect(inftState._lastTokenId).toBe('1')

  // Test changing gas values
  const setGasTx = await provider.Contract.call(
    inftContract,
    "setGas",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Uint64,
        value: '450000001',
      },
      {
        index: 1,
        format: ContractArgumentFormat.Uint64,
        value: '200000001',
      },
      {
        index: 2,
        format: ContractArgumentFormat.Uint64,
        value: '200000001',
      },
    ]
  )
  await provider.Chain.generateBlocks(1)

  rawState = await provider.Contract.readData(
    inftContract,
    "STATE",
    "string"
  )
  inftState = JSON.parse(rawState)
  console.log('STATE', inftState)
  expect(inftState).toHaveProperty('_identityCallbackGas', 450000001)
  expect(inftState).toHaveProperty('_generateGas', 200000001)
  expect(inftState).toHaveProperty('_mintGas', 200000001)
  expect(inftState._lastTokenId).toBe('1')



  gotBalance = await estimate_output(inftContract, "balanceOf", [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: addr,
    },
  ], provider)
  expect(parseInt(gotBalance, 16)).toBe(1)

  gotTokenByIndex = await estimate_output(inftContract, "tokenOfOwnerByIndex", [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: addr,
    },
    {
      index: 1,
      format: ContractArgumentFormat.Uint64,
      value: '0',
    },
  ], provider)
  // expect(parseInt(gotTokenByIndex, 16)).toBe(1)

  // Check that minted ID for identity is correct
  let gotMintedId = await provider.Contract.readMap(
    inftContract,
    "mi:",
    addr,
    "hex"
  )
  expect(gotMintedId).toBe(resultTokenId)
  gotMintedId = await estimate_output(inftContract, "mintedBy", [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: addr,
    },
  ], provider)
  expect(gotMintedId).toBe(resultTokenId)
  const buf = Buffer.from(gotMintedId.slice(2), "hex")
  const num = buf.readBigUInt64LE(0)
  console.log("minted parsed:", num)
  expect(Number(num)).toBe(1)

  // Check that owner is correct
  let gotOwner = await provider.Contract.readMap(
    inftContract,
    "ow:",
    resultTokenId,
    "hex"
  )
  expect(gotOwner).toBe(addr)
  gotOwner = await estimate_output(inftContract, "ownerOf", [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: resultTokenId,
    },
  ], provider)
  expect(gotOwner).toBe(addr)

  // Check that token URI is set
  let gotTokenUri = await provider.Contract.readMap(
    inftContract,
    "ur:",
    resultTokenId,
    "string"
  )
  expect(gotTokenUri).toBeDefined()
  gotTokenUri = await estimate_output(inftContract, "tokenURI", [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: resultTokenId,
    },
  ], provider)
  expect(gotTokenUri).toBeDefined()

  // Check that token approval is unset
  expect(async () => { throw await provider.Contract.readMap(
      inftContract,
      "ap:",
      resultTokenId,
      "string"
  )}).rejects.toThrow('data is nil')

  gotApproved = await estimate_output(inftContract, "getApproved", [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: resultTokenId,
    },
  ], provider)
  expect(gotApproved).toBe(ZERO_ADDRESS)

  gotApproved = await estimate_output(inftContract, "isApprovedForAll", [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: addr,
    },
    {
      index: 1,
      format: ContractArgumentFormat.Hex,
      value: RANDOM_ADDRESS,
    },
  ], provider)
  expect(gotApproved).toBe(FALSE_BOOL)


  // Try generating again
  const genAgainTx = await call_from(addr, provider,
    inftContract,
    "generate",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: genContract,
      },
    ]
  )

  await provider.Chain.generateBlocks(1)

  const genAgainReceipt = await provider.Chain.receipt(genAgainTx)
  console.log(genAgainReceipt)
  for (var i = 0; i < (genAgainReceipt.events || []).length; i++) {
    console.log(genAgainReceipt.events[i])
  }
  for (var i = 0; i < (genAgainReceipt.actionResult.subActionResults || []).length; i++) {
    console.log(genAgainReceipt.actionResult.subActionResults[i])
  }
  expect(genAgainReceipt.success).toBe(false)

  // Regenerate token
  const regenTx = await call_from(addr, provider,
    inftContract,
    "regenerate",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: resultTokenId,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Hex,
        value: genContract,
      },
    ]
  )

  await provider.Chain.generateBlocks(1)

  const regenReceipt = await provider.Chain.receipt(regenTx
)
  console.log(regenReceipt)
  for (var i = 0; i < (regenReceipt.events || []).length; i++) {
    // console.log(regenReceipt.events[i])
  }
  for (var i = 0; i < (regenReceipt.actionResult.subActionResults || []).length; i++) {
    console.log(regenReceipt.actionResult.subActionResults[i])
    expect(regenReceipt.actionResult.subActionResults[i].success).toBe(true)
    if (regenReceipt.actionResult.subActionResults[i].subActionResults) {
      for (var j = 0; j < (regenReceipt.actionResult.subActionResults[i].subActionResults || []).length; j++) {
        console.log(regenReceipt.actionResult.subActionResults[i].subActionResults[j])
        expect(regenReceipt.actionResult.subActionResults[i].subActionResults[j].success).toBe(true)
      }
    }
  }
  expect(regenReceipt.success).toBe(true)

  // Check that balance is still 1
  gotBalance = await estimate_output(inftContract, "balanceOf", [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: addr,
    },
  ], provider)
  expect(parseInt(gotBalance, 16)).toBe(1)

  // Check that minted ID for identity is still the same
  gotMintedId = await provider.Contract.readMap(
    inftContract,
    "mi:",
    addr,
    "hex"
  )
  expect(gotMintedId).toBe(resultTokenId)

  // Check that owner is still correct
  gotOwner = await provider.Contract.readMap(
    inftContract,
    "ow:",
    resultTokenId,
    "hex"
  )
  expect(gotOwner).toBe(addr)

  // Check that token URI is still set
  gotTokenUri = await provider.Contract.readMap(
    inftContract,
    "ur:",
    resultTokenId,
    "string"
  )
  expect(gotTokenUri).toBeDefined()

  // let contractState = await provider.Contract.readData(
  //   contract,
  //   "STATE",
  //   "string"
  // )
  // expect(JSON.parse(contractState)._totalSupply).toBe(mintAmount)
})

it("can transfer and burn", async () => {
  const {provider, inftContract} = await get_provider(true)
  const recvAddr = ONE_ADDRESS
  const ownedBy = {}
  ownedBy[ONE_ADDRESS] = new Set()

  // Generate on other addresses but not on the receiving address
  for (const addr of [TWO_ADDRESS, THREE_ADDRESS]) {
    const genTx = await call_from(addr, provider,
      inftContract,
      "generate",
      "0",
      "50000",
      [
        {
          index: 0,
          format: ContractArgumentFormat.Hex,
          value: ZERO_ADDRESS,
        },

      ]
    )

    await provider.Chain.generateBlocks(1)

    const genReceipt = await provider.Chain.receipt(genTx)
    console.log(genReceipt)
    for (var i = 0; i < (genReceipt.actionResult.subActionResults || []).length; i++) {
      expect(genReceipt.actionResult.subActionResults[i].success).toBe(true)
      if (genReceipt.actionResult.subActionResults[i].subActionResults) {
        for (var j = 0; j < (genReceipt.actionResult.subActionResults[i].subActionResults || []).length; j++) {
          expect(genReceipt.actionResult.subActionResults[i].subActionResults[j].success).toBe(true)
        }
      }
    }
    expect(genReceipt.success).toBe(true)
    const resultTokenId = genReceipt.actionResult.subActionResults[1].subActionResults[1].outputData
    ownedBy[addr] = new Set([resultTokenId])

    const approveTx = await call_from(addr, provider,
      inftContract,
      "approve",
      "0",
      "50000",
      [
        {
          index: 0,
          format: ContractArgumentFormat.Hex,
          value: RANDOM_ADDRESS,
        },
        {
          index: 1,
          format: ContractArgumentFormat.Hex,
          value: resultTokenId,
        },
      ]
    )
    await provider.Chain.generateBlocks(1)

    const approveReceipt = await provider.Chain.receipt(genTx)
    expect(approveReceipt.success).toBe(true)
  }

  const getBalance = async (address) => {
    let balanceOfRecv = await estimate_output(inftContract, "balanceOf", [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: address,
      },
    ], provider)
    return parseInt(balanceOfRecv, 16)
  }

  const verifyOwners = async (owners) => {
    const gotOwned = {}
    for (const addr of Object.keys(owners)) {
      let balance = await estimate_output(inftContract, "balanceOf", [
        {
          index: 0,
          format: ContractArgumentFormat.Hex,
          value: addr,
        },
      ], provider)
      balance = parseInt(balance, 16)
      console.log(owners[addr])
      expect(balance).toBe(owners[addr].size)
      gotOwned[addr] = new Set()
      // console.log(`Expecting ${Array.from(owners[addr])} for ${addr}`)
      for (let i = 0; i < balance; i++) {
        // console.log(`Checking token ${i}/${balance} of ${addr}`)
        const tokenId = await estimate_output(inftContract, "tokenOfOwnerByIndex", [
          {
            index: 0,
            format: ContractArgumentFormat.Hex,
            value: addr,
          },
          {
            index: 1,
            format: ContractArgumentFormat.Uint64,
            value: i.toString(),
          },
        ], provider)
        expect(parseInt(tokenId, 16)).toBeGreaterThan(0)
        // console.log(`Got token ${tokenId} for ${addr} (index ${i})`)
        gotOwned[addr].add(tokenId)
      }
      // Try accessing out of bounds token
      await estimate_output(inftContract, "tokenOfOwnerByIndex", [
        {
          index: 0,
          format: ContractArgumentFormat.Hex,
          value: addr,
        },
        {
          index: 1,
          format: ContractArgumentFormat.Uint64,
          value: balance.toString(),
        },
      ], provider, false)

      // console.log(gotOwned[addr])
      expect(gotOwned[addr]).toEqual(owners[addr])
    }
  }

  let recvBalance = await getBalance(recvAddr)
  expect(recvBalance).toBe(0)
  await verifyOwners(ownedBy)

  // Send tokens to the receiving address
  for (const addr of [THREE_ADDRESS, TWO_ADDRESS]) {
    const tokenId = await estimate_output(inftContract, "tokenOfOwnerByIndex", [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: addr,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Uint64,
        value: "0",
      },
    ], provider)
    let sendTx = await call_from(addr, provider,
      inftContract,
      'transferFrom',
      '0',
      '50000',
      [
        {
          index: 0,
          format: ContractArgumentFormat.Hex,
          value: addr,
        },
        {
          index: 1,
          format: ContractArgumentFormat.Hex,
          value: recvAddr,
        },
        {
          index: 2,
          format: ContractArgumentFormat.Hex,
          value: tokenId,
        },
      ])
    await provider.Chain.generateBlocks(1)

    const sendReceipt = await provider.Chain.receipt(sendTx)
    console.log(sendReceipt)
    expect(sendReceipt.success).toBe(true)
    ownedBy[addr].delete(tokenId)
    ownedBy[recvAddr].add(tokenId)
    await verifyOwners(ownedBy)

    // Check that balances changed
    const sendBalance = await getBalance(addr)
    expect(sendBalance).toBe(0)
    const newRecvBalance = await getBalance(recvAddr)
    expect(newRecvBalance).toBe(recvBalance + 1)
    recvBalance = newRecvBalance

    // Check that owner changed
    let owner = await provider.Contract.readMap(
      inftContract,
      "ow:",
      tokenId,
      "hex"
    )
    expect(owner).toBe(recvAddr)

    // Check that token approal is cleared
    expect(async () => { throw await provider.Contract.readMap(
        inftContract,
        "ap:",
        tokenId,
        "string"
    )}).rejects.toThrow('data is nil')
    const approved = await estimate_output(inftContract, "getApproved", [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: tokenId,
      },
    ], provider)
    expect(approved).toBe(ZERO_ADDRESS)

    let sendAgainTx = await call_from(addr, provider,
      inftContract,
      'transferFrom',
      '0',
      '50000',
      [
        {
          index: 0,
          format: ContractArgumentFormat.Hex,
          value: addr,
        },
        {
          index: 1,
          format: ContractArgumentFormat.Hex,
          value: recvAddr,
        },
        {
          index: 2,
          format: ContractArgumentFormat.Hex,
          value: tokenId,
        },
      ])
      await provider.Chain.generateBlocks(1)

      const sendAgainReceipt = await provider.Chain.receipt(sendAgainTx)
      console.log(sendAgainReceipt)
      expect(sendAgainReceipt.success).toBe(false)
  }

  // Try generation on an address that already has a token
  let genTx = await call_from(ONE_ADDRESS, provider,
    inftContract,
    'generate',
    '0',
    '50000',
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: ZERO_ADDRESS,
      },
    ])
  await provider.Chain.generateBlocks(1)

  let genReceipt = await provider.Chain.receipt(genTx)
  console.log(genReceipt)
  for (var i = 0; i < (genReceipt.actionResult.subActionResults || []).length; i++) {
    console.log(genReceipt.actionResult.subActionResults[i])
    expect(genReceipt.actionResult.subActionResults[i].success).toBe(true)
    if (genReceipt.actionResult.subActionResults[i].subActionResults) {
      for (var j = 0; j < (genReceipt.actionResult.subActionResults[i].subActionResults || []).length; j++) {
      console.log(genReceipt.actionResult.subActionResults[i].subActionResults[j])
        expect(genReceipt.actionResult.subActionResults[i].subActionResults[j].success).toBe(true)
      }
    }
  }
  expect(genReceipt.success).toBe(true)
  let generatedTokenId = genReceipt.actionResult.subActionResults[1].subActionResults[1].outputData
  ownedBy[ONE_ADDRESS].add(generatedTokenId)
  await verifyOwners(ownedBy)

  // Check that balance changed
  const genBalance = await getBalance(ONE_ADDRESS)
  expect(genBalance).toBe(ownedBy[ONE_ADDRESS].size)

  // Check that IDs are correct
  expect(ownedBy[ONE_ADDRESS]).toEqual(new Set(['0x0100000000000000', '0x0200000000000000', '0x0300000000000000']))

  // Try self transfer
  let selfSendTx = await call_from(recvAddr, provider,
    inftContract,
    'transferFrom',
    '0',
    '50000',
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: recvAddr,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Hex,
        value: recvAddr,
      },
      {
        index: 2,
        format: ContractArgumentFormat.Hex,
        value: generatedTokenId,
      },
    ])
  await provider.Chain.generateBlocks(1)

  const selfSendReceipt = await provider.Chain.receipt(selfSendTx)
  console.log(selfSendReceipt)
  expect(selfSendReceipt.success).toBe(true)
  await verifyOwners(ownedBy)

  // Check that balance hasn't changed
  const selfTransferBalance = await getBalance(ONE_ADDRESS)
  expect(selfTransferBalance).toBe(genBalance)
  // Burn all tokens
  const tokens = Array.from(ownedBy[ONE_ADDRESS])
  for (const tokenId of tokens) {
    // continue;
    const burnTx = await call_from(ONE_ADDRESS, provider,
      inftContract,
      'burn',
      '0',
      '50000',
      [
        {
          index: 0,
          format: ContractArgumentFormat.Hex,
          value: tokenId,
        },
      ])
    await provider.Chain.generateBlocks(1)
    const burnReceipt = await provider.Chain.receipt(burnTx)
    console.log(burnReceipt)
    expect(burnReceipt.success).toBe(true)

    ownedBy[ONE_ADDRESS].delete(tokenId)
    await verifyOwners(ownedBy)
  }

  // Try generation after burning all tokens
  genTx = await call_from(ONE_ADDRESS, provider,
    inftContract,
    'generate',
    '0',
    '50000',
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: ZERO_ADDRESS,
      },
    ])
  await provider.Chain.generateBlocks(1)

  genReceipt = await provider.Chain.receipt(genTx)
  console.log(genReceipt)
  expect(genReceipt.success).toBe(false)

  // Try regeneration after burning all tokens
  genTx = await call_from(ONE_ADDRESS, provider,
    inftContract,
    'regenerate',
    '0',
    '50000',
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: generatedTokenId,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Hex,
        value: ZERO_ADDRESS,
      },
    ])
  await provider.Chain.generateBlocks(1)

  genReceipt = await provider.Chain.receipt(genTx)
  console.log(genReceipt)
  expect(genReceipt.success).toBe(false)
  await verifyOwners(ownedBy)
})

it("can approve", async () => {
  const {provider, inftContract} = await get_provider(true)
  const user = ONE_ADDRESS
  const operator = TWO_ADDRESS

  const genTx = await call_from(user, provider,
    inftContract,
    "generate",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: ZERO_ADDRESS,
      },

    ]
  )

  await provider.Chain.generateBlocks(1)
  const genReceipt = await provider.Chain.receipt(genTx)
  const resultTokenId = genReceipt.actionResult.subActionResults[1].subActionResults[1].outputData

  // Test before approval
  let sendTx = await call_from(operator, provider,
    inftContract,
    "transferFrom",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: user,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Hex,
        value: TWO_ADDRESS,
      },
      {
        index: 2,
        format: ContractArgumentFormat.Hex,
        value: resultTokenId,
      },
    ]
  )
  await provider.Chain.generateBlocks(1)
  let sendReceipt = await provider.Chain.receipt(sendTx)
  console.log(sendReceipt)
  expect(sendReceipt.success).toBe(false)

  // Set approval
  const approveTx = await call_from(user, provider,
    inftContract,
    "approve",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: operator,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Hex,
        value: resultTokenId,
      },
    ]
  )
  await provider.Chain.generateBlocks(1)
  const approveReceipt = await provider.Chain.receipt(approveTx)
  expect(approveReceipt.success).toBe(true)

  const approved = await estimate_output(inftContract, "getApproved", [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: resultTokenId,
    },
  ], provider)
  expect(approved).toBe(operator)

  // Test after approval
  sendTx = await call_from(operator, provider,
    inftContract,
    "transferFrom",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: user,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Hex,
        value: operator,
      },
      {
        index: 2,
        format: ContractArgumentFormat.Hex,
        value: resultTokenId,
      },
    ]
  )
  await provider.Chain.generateBlocks(1)
  sendReceipt = await provider.Chain.receipt(sendTx)
  console.log(sendReceipt)
  expect(sendReceipt.success).toBe(true)

  // Send back
  sendTx = await call_from(operator, provider,
    inftContract,
    "transferFrom",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: operator,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Hex,
        value: user,
      },
      {
        index: 2,
        format: ContractArgumentFormat.Hex,
        value: resultTokenId,
      },
    ]
  )
  await provider.Chain.generateBlocks(1)
  sendReceipt = await provider.Chain.receipt(sendTx)
  console.log(sendReceipt)
  expect(sendReceipt.success).toBe(true)

  // Set operator approval
  const setOperatorTx = await call_from(user, provider,
    inftContract,
    "setApprovalForAll",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: operator,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Bool,
        value: TRUE_BOOL,
      },
    ]
  )
  await provider.Chain.generateBlocks(1)
  const setOperatorReceipt = await provider.Chain.receipt(setOperatorTx)
  console.log(setOperatorReceipt)
  expect(setOperatorReceipt.success).toBe(true)

  // Check operator approval
  const isOperator = await estimate_output(inftContract, "isApprovedForAll",
  [
    {
      index: 0,
      format: ContractArgumentFormat.Hex,
      value: user,
    },
    {
      index: 1,
      format: ContractArgumentFormat.Hex,
      value: operator,
    },
  ], provider)
  expect(isOperator).toBe(TRUE_BOOL)

  // Test after operator approval
  sendTx = await call_from(operator, provider,
    inftContract,
    "transferFrom",
    "0",
    "50000",
    [
      {
        index: 0,
        format: ContractArgumentFormat.Hex,
        value: user,
      },
      {
        index: 1,
        format: ContractArgumentFormat.Hex,
        value: operator,
      },
      {
        index: 2,
        format: ContractArgumentFormat.Hex,
        value: resultTokenId,
      },
    ]
  )
  await provider.Chain.generateBlocks(1)
  sendReceipt = await provider.Chain.receipt(sendTx)
  console.log(sendReceipt)
  expect(sendReceipt.success).toBe(true)
})
