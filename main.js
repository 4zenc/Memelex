import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "https://cdn.skypack.dev/@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  AuthorityType
} from "https://cdn.skypack.dev/@solana/spl-token";

const connectBtn = document.getElementById("connectWallet");
const createBtn = document.getElementById("createTokenBtn");
const form = document.getElementById("tokenForm");
const statusBox = document.getElementById("status");

let provider = null;
let wallet = null;
let connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
const feeWallet = new PublicKey("HU9pWcAsMrqAoqGgsH9oqhcLP1Rp4wS1z43Jxh6TvrMg");

connectBtn.onclick = async () => {
  if (window.solana && window.solana.isPhantom) {
    try {
      const resp = await window.solana.connect();
      wallet = resp.publicKey;
      connectBtn.textContent = wallet.toString().slice(0, 4) + "..." + wallet.toString().slice(-4);
      createBtn.disabled = false;
    } catch (err) {
      console.error("Wallet connect failed:", err);
    }
  } else {
    alert("Please install Phantom Wallet.");
  }
};

form.onsubmit = async (e) => {
  e.preventDefault();
  if (!wallet) return;

  const name = document.getElementById("name").value.trim();
  const symbol = document.getElementById("symbol").value.trim();
  const decimals = parseInt(document.getElementById("decimals").value);
  const supply = parseInt(document.getElementById("supply").value);
  const revokeFreeze = document.getElementById("revokeFreeze").checked;
  const revokeMint = document.getElementById("revokeMint").checked;

  const totalFeeLamports = 0.2 * 1e9;

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet,
      toPubkey: feeWallet,
      lamports: totalFeeLamports,
    })
  );

  try {
    const sig = await window.solana.signAndSendTransaction(tx);
    await connection.confirmTransaction(sig.signature);
  } catch (err) {
    alert("Transaction failed or rejected.");
    return;
  }

  try {
    const mint = await createMint(
      connection,
      window.solana,
      wallet,
      wallet,
      decimals
    );

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      window.solana,
      mint,
      wallet
    );

    await mintTo(
      connection,
      window.solana,
      mint,
      ata.address,
      wallet,
      supply * Math.pow(10, decimals)
    );

    if (revokeFreeze) {
      await setAuthority(
        connection,
        window.solana,
        mint,
        wallet,
        AuthorityType.FreezeAccount,
        null
      );
    }

    if (revokeMint) {
      await setAuthority(
        connection,
        window.solana,
        mint,
        wallet,
        AuthorityType.MintTokens,
        null
      );
    }

    statusBox.style.display = "block";
    statusBox.textContent = `✅ Token Created! View on Solscan:
https://solscan.io/token/${mint.toBase58()}`;
  } catch (e) {
    console.error("Token creation error:", e);
    alert("Token creation failed. Check console.");
  }
};
