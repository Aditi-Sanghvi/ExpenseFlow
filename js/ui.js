import { db, ref, push, onValue, remove } from "./firebase.js";
document.addEventListener("DOMContentLoaded", function(){

const auth = window.ExpenseFlowAuth;
const session = auth.getSession();

// 🔒 If NOT logged in → go to login
if (!session || !session.email) {
    window.location.href = "login.html";
}
const currentUser = session.email.replace(/\./g, "_");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const expenseForm = document.getElementById("expenseForm");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");
const searchInput = document.getElementById("searchInput");

const expenseName = document.getElementById("expenseName");
const expenseAmount = document.getElementById("expenseAmount");
const expenseCategory = document.getElementById("expenseCategory");
const expenseType = document.getElementById("expenseType");

const expenseList = document.getElementById("expenseList");
const successMessage = document.getElementById("successMessage");

const groupSplitSection = document.getElementById("groupSplitSection");
const groupParticipants = document.getElementById("groupParticipants");
const splitMethod = document.getElementById("splitMethod");
const splitDetails = document.getElementById("splitDetails");
const splitError = document.getElementById("splitError");
const splitResult = document.getElementById("splitResult");
const splitResultList = document.getElementById("splitResultList");

const totalAmount = document.getElementById("totalAmount");
const deleteMessage = document.getElementById("deleteMessage");
const filterButtons = document.querySelectorAll(".filterBtn");

const navDashboard = document.getElementById("navDashboard");
const navPersonal = document.getElementById("navPersonal");
const navGroup = document.getElementById("navGroup");
const navAnalytics = document.getElementById("navAnalytics");

const dashboardSection = document.getElementById("dashboardSection");
const analyticsSection = document.getElementById("analyticsSection");


const personalBudgetInput = document.getElementById("personalBudgetInput");
const groupBudgetInput = document.getElementById("groupBudgetInput");

const setPersonalBudgetBtn = document.getElementById("setPersonalBudgetBtn");
const setGroupBudgetBtn = document.getElementById("setGroupBudgetBtn");

const personalBudgetStatus = document.getElementById("personalBudgetStatus");
const groupBudgetStatus = document.getElementById("groupBudgetStatus");
const personalProgress = document.getElementById("personalProgress");
const groupProgress = document.getElementById("groupProgress");

let expenseChart = null;
let personalBudget = 0;
let groupBudget = 0;
let budget = 0;

let personalTotal = 0;
let groupTotal = 0;

let expenses = [];


let total = 0;

let categoryTotals = {
    Food: 0,
    Travel: 0,
    Shopping: 0,
    Bills: 0,
    Other: 0
};

// Show form
addExpenseBtn.addEventListener("click", function () {
    expenseForm.style.display = "block";
});

function parseParticipants(raw) {
    return raw
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .filter((name, idx, arr) => arr.indexOf(name) === idx);
}

function moneyRound(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function showSplitError(message) {
    splitError.textContent = message;
    splitError.style.display = message ? "block" : "none";
}

function renderSplitResultList(splits) {
    if (!splitResult || !splitResultList) return;
    splitResultList.innerHTML = "";

    splits.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = `${s.name}: ₹${moneyRound(s.amount)}`;
        splitResultList.appendChild(li);
    });

    splitResult.style.display = "block";
}

function hideSplitResult() {
    if (!splitResult || !splitResultList) return;
    splitResult.style.display = "none";
    splitResultList.innerHTML = "";
}

function renderSplitInputs(participants) {
    splitDetails.innerHTML = "";
    const method = splitMethod.value;
    showSplitError("");
    hideSplitResult();

    if (method !== "exact") return;

    participants.forEach((p) => {
        const row = document.createElement("div");
        row.className = "split-row";
        row.innerHTML = `
            <input type="text" value="${p}" disabled>
            <input type="number" min="0" step="0.01" data-person="${p}" placeholder="₹0.00">
        `;
        splitDetails.appendChild(row);
    });

    splitDetails.querySelectorAll("input[data-person]").forEach((inp) => {
        inp.addEventListener("input", liveUpdateSplitPreview);
    });
}

function liveUpdateSplitPreview() {
    if (expenseType.value !== "Group") return;

    const amount = Number(expenseAmount.value);
    if (!amount || amount <= 0) {
        hideSplitResult();
        return;
    }

    const participants = parseParticipants(groupParticipants.value);
    if (participants.length < 2) {
        hideSplitResult();
        return;
    }

    if (splitMethod.value === "equal") {
        const res = buildSplits(amount, participants);
        if (res.ok) renderSplitResultList(res.splits);
        else hideSplitResult();
        return;
    }

    const inputs = Array.from(splitDetails.querySelectorAll("input[data-person]"));
    if (inputs.length === 0) {
        hideSplitResult();
        return;
    }

    const res = buildSplits(amount, participants);
    if (res.ok) {
        renderSplitResultList(res.splits);
        showSplitError("");
    } else {
        hideSplitResult();
        showSplitError(res.error);
    }
}

function updateSplitVisibility() {
    const isGroup = expenseType.value === "Group";
    groupSplitSection.style.display = isGroup ? "block" : "none";
    showSplitError("");
    hideSplitResult();

    if (!isGroup) {
        groupParticipants.value = "";
        splitMethod.value = "equal";
        splitDetails.innerHTML = "";
    } else {
        const participants = parseParticipants(groupParticipants.value);
        renderSplitInputs(participants);
        liveUpdateSplitPreview();
    }
}

expenseType.addEventListener("change", updateSplitVisibility);
groupParticipants.addEventListener("input", () => {
    if (expenseType.value !== "Group") return;
    renderSplitInputs(parseParticipants(groupParticipants.value));
    liveUpdateSplitPreview();
});
splitMethod.addEventListener("change", () => {
    if (expenseType.value !== "Group") return;
    renderSplitInputs(parseParticipants(groupParticipants.value));
    liveUpdateSplitPreview();
});
expenseAmount.addEventListener("input", () => {
    if (expenseType.value !== "Group") return;
    liveUpdateSplitPreview();
});

function buildSplits(totalAmount, participants) {
    const method = splitMethod.value;

    if (participants.length < 2) {
        return { ok: false, error: "Add at least 2 participants to split a group expense." };
    }

    if (method === "equal") {
        const base = moneyRound(totalAmount / participants.length);
        const splits = participants.map((name) => ({ name, amount: base }));
        const sum = moneyRound(splits.reduce((acc, s) => acc + s.amount, 0));
        const diff = moneyRound(totalAmount - sum);
        splits[0].amount = moneyRound(splits[0].amount + diff); // fix rounding remainder
        return { ok: true, splits, method };
    }


    const inputs = Array.from(splitDetails.querySelectorAll("input[data-person]"));
    const splits = inputs.map((inp) => ({
        name: inp.dataset.person,
        amount: moneyRound(Number(inp.value || 0)),
    }));

    const sum = moneyRound(splits.reduce((acc, s) => acc + s.amount, 0));
    if (sum !== moneyRound(totalAmount)) {
        return { ok: false, error: `Split amounts must add up to ₹${moneyRound(totalAmount)} (currently ₹${sum}).` };
    }

    return { ok: true, splits, method };
}

function formatSplitHint(exp) {
    if (!exp.splits || !Array.isArray(exp.splits) || exp.splits.length === 0) return "";
    const preview = exp.splits
        .slice(0, 3)
        .map(s => `${s.name}: ₹${s.amount}`)
        .join(", ");
    const extra = exp.splits.length > 3 ? ` +${exp.splits.length - 3} more` : "";
    return `Split (${exp.splitMethod || "equal"}): ${preview}${extra}`;
}

function formatSavedSplitList(exp) {
    if (!exp.splits || !Array.isArray(exp.splits) || exp.splits.length === 0) return "";
    const items = exp.splits
        .map(s => `<li>${s.name}: ₹${moneyRound(s.amount)}</li>`)
        .join("");
    return `<ul class="split-saved">${items}</ul>`;
}


// Save expense
saveExpenseBtn.addEventListener("click", function () {

    const name = expenseName.value;
    const amount = Number(expenseAmount.value);
    const category = expenseCategory.value;
    const type = expenseType.value;

    if(name === "" || amount <=0 || category === "" || type==="" ){
        alert("Please fill all fields");
        return;
    }

    const expense = {
        name: name,
        amount: amount,
        category: category,
        type: type
    };

    if (type === "Group") {
        const participants = parseParticipants(groupParticipants.value);
        const res = buildSplits(amount, participants);
        if (!res.ok) {
            showSplitError(res.error);
            return;
        }
        expense.splits = res.splits;
        expense.splitMethod = res.method;
    }
   

   saveToFirebase(expense);
    successMessage.style.display = "block";

    setTimeout(function(){
        successMessage.style.display = "none";
    },2000);


    expenseName.value = "";
    expenseAmount.value = "";
    expenseCategory.value = "";
    expenseType.value = "";
    updateSplitVisibility();
});


function saveToFirebase(expense){
    console.log("Saving:", expense); 
    push(ref(db, "expenses/" + currentUser), expense);
}

function loadFromFirebase(){

   const expenseRef = ref(db, "expenses/" + currentUser);

    onValue(expenseRef, (snapshot) => {

        console.log("Snapshot:", snapshot.val());

        expenseList.innerHTML = "";

        total = 0;
        personalTotal = 0;
        groupTotal = 0;

        categoryTotals = {
            Food: 0,
            Travel: 0,
            Shopping: 0,
            Bills: 0,
            Other: 0
        };

        expenses = [];

        const data = snapshot.val();

        if(data){
            Object.keys(data).forEach(key => {

                const exp = data[key];
                exp.id = key;

                expenses.push(exp);

                addExpenseToUI(exp);
            });
        }

        updateBudgetUI();
         updateChart();
    });
}
function addExpenseToUI(exp){

    let emoji = "";

    if(exp.category === "Food") emoji = "🍔";
    else if(exp.category === "Travel") emoji = "🚕";
    else if(exp.category === "Shopping") emoji = "🛍️";
    else if(exp.category === "Bills") emoji = "📄";
    else emoji = "💸";
    const row = document.createElement("div");
    row.classList.add("expense-row");
if(exp.type === "Personal"){
    personalTotal += exp.amount;
} else {
    groupTotal += exp.amount;
}


document.getElementById("personalAmount").textContent = "₹" + personalTotal;
document.getElementById("groupAmount").textContent = "₹" + groupTotal;

    const splitHint = exp.type === "Group" ? formatSplitHint(exp) : "";
    const splitList = exp.type === "Group" ? formatSavedSplitList(exp) : "";
    row.innerHTML = `
       <span>
            ${emoji} ${exp.name}
            ${splitHint ? `<div class="split-hint">${splitHint}</div>` : ``}
            ${splitList ? `${splitList}` : ``}
       </span>
        <span style="color:#10b981;">₹${exp.amount}</span>
        <span class="category ${exp.category}">${exp.category}</span>
        <button class="deleteBtn">Delete</button>
    `;

    expenseList.appendChild(row);

    // update totals
    total += exp.amount;
    totalAmount.textContent = "₹" + total;

    categoryTotals[exp.category] += exp.amount;
    updateChart();

    updateBudgetUI();
    // delete logic
    const deleteBtn = row.querySelector(".deleteBtn");

deleteBtn.addEventListener("click", function(){

    // 🔥 DELETE FROM FIREBASE
    remove(ref(db, "expenses/" + currentUser + "/" + exp.id));
        
    });
}

searchInput.addEventListener("input", function(){

    const searchText = searchInput.value.toLowerCase();

    expenseList.innerHTML = "";
    total = 0;
    personalTotal = 0;
    groupTotal = 0;
    categoryTotals = { Food:0, Travel:0, Shopping:0, Bills:0, Other:0 };

    expenses
        .filter(exp => exp.name.toLowerCase().includes(searchText))
        .forEach(exp => addExpenseToUI(exp));

});
filterButtons.forEach(button => {
    button.addEventListener("click", function(){

        filterButtons.forEach(btn => btn.classList.remove("active"));

        this.classList.add("active");

        const category = this.dataset.category;

        expenseList.innerHTML = "";
        total = 0;
        personalTotal = 0;
        groupTotal = 0;
        categoryTotals = { Food:0, Travel:0, Shopping:0, Bills:0, Other:0 };

        let filtered = expenses;

        if(category !== "All"){
            filtered = expenses.filter(exp => exp.category === category);
        }

        filtered.forEach(exp => addExpenseToUI(exp));
    });
});

 
function setActive(nav){
    document.querySelectorAll(".sidebar li").forEach(item => {
        item.classList.remove("active");
    });
    nav.classList.add("active");
}

navDashboard.addEventListener("click", function(){
    setActive(this);

    dashboardSection.style.display = "block";
    analyticsSection.style.display = "none";
});



navAnalytics.addEventListener("click", function(){

    setActive(this);

    dashboardSection.style.display = "none";
    analyticsSection.style.display = "block";

    const canvas = document.getElementById("expenseChart");

    // 🔥 WAIT for DOM to render
    setTimeout(() => {

        if(!expenseChart){
            const ctx = canvas.getContext("2d");

            expenseChart = new Chart(ctx, {
                type: "pie",
                data: {
                    labels: ["Food", "Travel", "Shopping", "Bills", "Other"],
                    datasets: [{
                        data: [1,1,1,1,1],
                        backgroundColor: [
                            "#22c55e",
                            "#3b82f6",
                            "#a855f7",
                            "#ef4444",
                            "#6b7280"
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        updateChart(); // 🔥 update AFTER render

    }, 200); // small delay

});
navPersonal.addEventListener("click", function(){
    setActive(this);

    dashboardSection.style.display = "block";
    analyticsSection.style.display = "none";

    expenseList.innerHTML = "";

    const filtered = expenses.filter(exp => exp.type === "Personal");

    filtered.forEach(exp => addExpenseToUI(exp));

    recalculateTotals(filtered); 
});
navGroup.addEventListener("click", function(){
    setActive(this);

    dashboardSection.style.display = "block";
    analyticsSection.style.display = "none";

    expenseList.innerHTML = "";

    const filtered = expenses.filter(exp => exp.type === "Group");

    filtered.forEach(exp => addExpenseToUI(exp));

    recalculateTotals(filtered);
});

setPersonalBudgetBtn.addEventListener("click", function(){

    console.log("CLICKED"); 

    personalBudget = Number(personalBudgetInput.value);

    if(personalBudget <= 0){
        alert("Enter valid personal budget");
        return;
    }

    personalBudgetStatus.textContent = `₹${personalTotal} / ₹${personalBudget}`;
});

if (setGroupBudgetBtn) setGroupBudgetBtn.addEventListener("click", function(){
    groupBudget = Number(groupBudgetInput.value);

    if(groupBudget <= 0){
        alert("Enter valid group budget");
        return;
    }

    updateBudgetUI();
});
function updateChart(){
    if(!expenseChart) return;

    const data = [
        categoryTotals.Food,
        categoryTotals.Travel,
        categoryTotals.Shopping,
        categoryTotals.Bills,
        categoryTotals.Other
    ];

    if(data.every(val => val === 0)){
        expenseChart.data.datasets[0].data = [1,1,1,1,1];
    } else {
        expenseChart.data.datasets[0].data = data;
    }

    expenseChart.update();
}
function recalculateTotals(filteredExpenses){

    total = 0;
    personalTotal = 0;
    groupTotal = 0;

    categoryTotals = { Food:0, Travel:0, Shopping:0, Bills:0, Other:0 };

    filteredExpenses.forEach(exp => {

        total += exp.amount;

        if(exp.type === "Personal"){
            personalTotal += exp.amount;
        } else {
            groupTotal += exp.amount;
        }

        categoryTotals[exp.category] += exp.amount;
    });

    totalAmount.textContent = "₹" + total;
    document.getElementById("personalAmount").textContent = "₹" + personalTotal;
    document.getElementById("groupAmount").textContent = "₹" + groupTotal;

    updateChart();
} 
function updateBudgetUI(){

    // PERSONAL
    if(personalBudget > 0){

        const percent = Math.min((personalTotal / personalBudget) * 100, 100);

        personalProgress.style.width = percent + "%";

        personalBudgetStatus.textContent =
            `₹${personalTotal} / ₹${personalBudget}`;

    } else {
        personalBudgetStatus.textContent = "No personal budget";
        personalProgress.style.width = "0%";
    }

    // GROUP
    if(groupBudget > 0){

        const percent = Math.min((groupTotal / groupBudget) * 100, 100);

        groupProgress.style.width = percent + "%";

        groupBudgetStatus.textContent =
            `₹${groupTotal} / ₹${groupBudget}`;

    } else {
        groupBudgetStatus.textContent = "No group budget";
        groupProgress.style.width = "0%";
    }
}
loadFromFirebase();
});