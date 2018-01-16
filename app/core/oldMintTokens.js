// @flow
import Neon, { wallet, api, rpc } from 'neon-js'
import { toNumber } from './math'

const neoAssetId =
  'c56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b'

export const oldMintTokens = (
  net: string,
  scriptHash: string,
  fromWifOrPublicKey: string,
  neo: number,
  gasCost: number,
  signingFunction
): Promise<*> => {
  const account = new wallet.Account(fromWifOrPublicKey)
  const intents = [{ assetId: neoAssetId, value: parseInt(neo), scriptHash }]
  const invoke = { operation: 'mintTokens', scriptHash, args: [] }
  // NOTE that I am handling this here instead of neon-js becuase this is throwaway code shortly
  // so do not want to edit neon-js for this
  const rpcEndpointPromise = api.neoscan
    .getRPCEndpoint(net)
    .catch(() => api.neonDB.getRPCEndpoint(net))
  const balancePromise = api.neoscan
    .getBalance(net, account.address)
    .catch(() => api.neonDB.getBalance(net, account.address))
  let signedTx
  let endpt
  return Promise.all([rpcEndpointPromise, balancePromise])
    .then(values => {
      endpt = values[0]
      let balances = values[1]
      const unsignedTx = Neon.create.invocationTx(
        balances,
        intents,
        invoke,
        gasCost,
        { version: 1 }
      )
      if (signingFunction) {
        return signingFunction(unsignedTx, account.publicKey)
      } else {
        return unsignedTx.sign(account.privateKey)
      }
    })
    .then(signedResult => {
      signedTx = signedResult
      return rpc.Query.sendRawTransaction(signedTx).execute(endpt)
    })
    .then(res => {
      if (res.result === true) {
        res.txid = signedTx.hash
      }
      return res
    })
}