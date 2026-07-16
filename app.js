// Replace this with your exact deployed smart contract address
const contractAddress = "0xAfe1Cfe5AD1F2281beE47222ecb93e47d9c7b7ce"; // Paste your actual contract address here

const contractABI = [
    "function getLockedAmount(address _beneficiary) view returns (uint256)",
    "function getReleaseTime(address _beneficiary) view returns (uint256)",
    "function release() external"
];

let provider, signer, vestingContract, userAddress;

async function connectWallet() {
    if (typeof window.ethereum !== "undefined") {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            userAddress = await signer.getAddress();

            // Toggle connect states beautifully
            document.getElementById("connectBtn").innerText = "Wallet Connected ✅";
            document.getElementById("connectBtn").disabled = true;
            document.getElementById("connectBtn").className = "py-2 px-4 bg-slate-900 text-emerald-400 border border-slate-800 text-xs font-bold rounded-lg cursor-default";
            
            document.getElementById("walletAddress").innerText = userAddress;
            document.getElementById("connectPrompt").classList.add("hidden");
            document.getElementById("dashboard").classList.remove("hidden");

            // Setup contract link to Etherscan
            const explorerLink = `https://sepolia.etherscan.io/address/${contractAddress}`;
            document.getElementById("contractExplorerLink").innerText = contractAddress;
            document.getElementById("contractExplorerLink").href = explorerLink;

            vestingContract = new ethers.Contract(contractAddress, contractABI, signer);
            
            await loadVestingData();
        } catch (error) {
            console.error("Connection failed:", error);
        }
    } else {
        alert("MetaMask not found! Please install MetaMask to view this live DApp.");
    }
}

async function loadVestingData() {
    try {
        const locked = await vestingContract.getLockedAmount(userAddress);
        const releaseTimeRaw = await vestingContract.getReleaseTime(userAddress);
        
        const formattedLocked = ethers.utils.formatEther(locked);
        const releaseTimestamp = releaseTimeRaw.toNumber();
        const currentTimestamp = Math.floor(Date.now() / 1000);

        document.getElementById("lockedBalance").innerText = parseFloat(formattedLocked).toFixed(2);

        if (releaseTimestamp === 0) {
            document.getElementById("releaseDate").innerText = "No Schedule";
            updateStatus("No Active Vesting", "bg-red-500/10 text-red-400 border-red-500/20");
            return;
        }

        const unlockDate = new Date(releaseTimestamp * 1000);
        document.getElementById("releaseDate").innerText = unlockDate.toLocaleDateString() + " " + unlockDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const claimBtn = document.getElementById("claimBtn");

        if (parseFloat(formattedLocked) === 0) {
            updateStatus("Fully Claimed", "bg-emerald-500/10 text-emerald-400 border-emerald-500/20");
            disableClaimBtn(claimBtn, "All Tokens Claimed");
        } else if (currentTimestamp >= releaseTimestamp) {
            updateStatus("Unlocked", "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse");
            enableClaimBtn(claimBtn);
        } else {
            updateStatus("Locked", "bg-amber-500/10 text-amber-400 border-amber-500/20");
            disableClaimBtn(claimBtn, "Tokens are Locked");
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

function updateStatus(text, classes) {
    const statusLabel = document.getElementById("lockStatus");
    statusLabel.innerText = text;
    statusLabel.className = `text-[10px] font-black tracking-wide uppercase px-3 py-1.5 rounded-lg border ${classes} inline-block`;
}

function enableClaimBtn(btn) {
    btn.disabled = false;
    btn.className = "w-full py-4 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.99] text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer transition duration-200";
    btn.innerText = "Execute Claim Operation";
}

function disableClaimBtn(btn, text) {
    btn.disabled = true;
    btn.className = "w-full py-4 bg-slate-900 text-slate-500 font-bold rounded-xl cursor-not-allowed transition duration-200 border border-slate-800/50";
    btn.innerText = text;
}

async function claimTokens() {
    try {
        const tx = await vestingContract.release();
        document.getElementById("claimBtn").innerText = "Executing On-Chain...";
        await tx.wait();
        alert("Success! Your allocation has been settled into your wallet.");
        loadVestingData();
    } catch (error) {
        console.error("Transaction failed:", error);
        alert("Transaction rejected or failed.");
        loadVestingData();
    }
}