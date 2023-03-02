import { BigNumber, Contract, providers, utils } from "ethers";
import div from "next/head";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { STAKE_CONTRACT_ADDRESS, stake_abi, TOKEN_ADDRESS, token_abi, NFT_ADDRESS, nft_abi } from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  // checks if the currently connected MetaMask wallet is the owner of the contract
  const [isOwner, setIsOwner] = useState(false);
  // tokenIdsMinted keeps track of the number of tokenIds that have been minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");

  const [stakedNFTs, setNfts] = useState([]);
  const [enterId, setEnter] = useState("");

  const [rewardsToken, setRewards] = useState();
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();

  const nftContainer = useRef();

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };


  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Goerli network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Change the network to Goerli");
      throw new Error("Change network to Goerli");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const stakeNFT = async (event) => {
    try {
      event.preventDefault();

      const signer = await getProviderOrSigner(true);
      const stakeContract = new Contract(STAKE_CONTRACT_ADDRESS, stake_abi, signer);
      const vintage = new Contract(NFT_ADDRESS, nft_abi, signer);
      const addr = await signer.getAddress();
      const approved = await vintage.isApprovedForAll(addr, STAKE_CONTRACT_ADDRESS);
      console.log(approved)
      if (approved) {
        const tx = await stakeContract.stake(enterId);
        setLoading(true);
        await tx.wait();
        setLoading(false);
        nfts_container();
      } else {
        const vx = vintage.setApprovalForAll(STAKE_CONTRACT_ADDRESS, true);
        setLoading(true);
        await vx.await();
        setLoading(false);
        const tx = await stakeContract.stake(enterId);
        setLoading(true);
        await tx.wait();
        setLoading(false);
        nfts_container();
      }

    } catch (err) {
      console.error(err);
      setLoading(false);
    }

  }

  const withdraw = async (event) => {
    try {
      event.preventDefault;
      const signer = await getProviderOrSigner(true);
      const stakeContract = new Contract(STAKE_CONTRACT_ADDRESS, stake_abi, signer);
      const num = event.target.name.split('#');
      const tx = await stakeContract.withdraw(num[1]);
      setLoading(true);
      await tx.wait();
      setLoading(false);
      nfts_container();

    } catch (err) {
      console.error(err);
    }
  }

  const claimRewards = async (event) => {
    try {
      event.preventDefault;
      const signer = await getProviderOrSigner(true);
      const stakeContract = new Contract(STAKE_CONTRACT_ADDRESS, stake_abi, signer);
      const num = event.target.name.split('#');
      const tx = await stakeContract.claimRewards();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      nfts_container();

    } catch (err) {
      console.error(err);
    }
  }

  const getRewards = async () => {
    try {
      // event.preventDefault();
      const signer = await getProviderOrSigner(true);
      const stakeContract = new Contract(STAKE_CONTRACT_ADDRESS, stake_abi, signer);
      const addr = await signer.getAddress();
      const clientData = await stakeContract.availableRewards(addr);
      setRewards(utils.formatEther(clientData));
    } catch (err) {
      console.error(err);
    }
  }


  const nfts_container = async () => {
    try {
      // event.preventDefault();
      const nftdata = [];
      const signer = await getProviderOrSigner(true);
      const addr = await signer.getAddress();
      const stakeContract = new Contract(STAKE_CONTRACT_ADDRESS, stake_abi, signer);
      const vintage = new Contract(NFT_ADDRESS, nft_abi, signer);
      const nfts1 = await stakeContract.getStakedTokens(addr);
      const result = nfts1.map(nf => { return utils.formatEther(nf[1]) });
      nfts1.forEach(async element => {
        const dtax = await vintage.tokenURI(element[1]);
        fetch(dtax)
          .then(response => response.json())
          .then(data => { nftdata.push({ "tokenId": utils.formatEther(element[1]), "data": data }); });

      });
      await setNfts(nftdata);
      console.log(stakedNFTs);
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal className to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      nfts_container();
      console.log(rewardsToken);
      setInterval(async function () {
        await getRewards();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  const renderButton = () => {
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    } else {
      return (
        <form className={`${styles.container} ${styles.stakeForm}`}>
          <input type="number" value={enterId} onChange={(event) => { event.preventDefault; const data = event.target.value; setEnter(data); }} />
          <button onClick={(e) => { stakeNFT(e) }}>{loading ? "Loading " : "Stake"}</button>
        </form>
      );
    }

  };

  return (
    <div>
      <div className={styles.back}></div>

      <div className={styles.main}>
        <div className={styles.header}>
          <div>Staking decentralized application</div>
        </div>
        <div className={styles.bar}>
          <div className={styles.rewards}>Claimable Rewards</div>
        </div>
        <div className={styles.bar_label}>
          <div className={styles.rewards}>{rewardsToken}</div>
          <button onClick={(e) => { claimRewards(e) }} className={`${styles.staken} ${styles.claimrwrds}`}>{loading ? "Loading ..." : "Claim Rewards"}</button>
        </div>
        <div className={styles.stake}>
          {renderButton()}
        </div>

        <div className={styles.container} ref={nftContainer} id="container">
          {[...stakedNFTs].map((stkn, keyi) => {
            const srcpath = stkn["data"]["image"].split("/");
            return (
              <div className={styles.card} key={keyi}>
                <div className={styles.card_image}> <Image src={`https://ipfs.io/ipfs/${srcpath[2]}/${srcpath[3]}`} width={'270px'} height='180px' alt="nft image" /></div>
                <div className={styles.card_title}>{stkn["data"]["name"]}</div>
                <button onClick={(e) => { withdraw(e) }} name={"nft#" + Math.round(parseFloat(stkn["tokenId"]) * (10 ** 18))}>{loading ? "Loading ..." : "Withdraw"}</button>
              </div>
            )
          })}
        </div>

      </div>

      {/* <template>
      <div className={styles.card} id="">
        <div className={styles.card_image}> <Image src="/" width="100%" height="100%" onError={() => {this.src='../public/error.png'}} alt="nft image"/></div>
        <div className={styles.card_title}></div>
        <button onClick="">Withdraw</button>
      </div>
    </template> */}
    </div>
  );
}