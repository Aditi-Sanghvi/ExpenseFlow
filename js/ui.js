import { db, ref, push, onValue, remove } from "./firebase.js";
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
   

   saveToFirebase(expense);
    successMessage.style.display = "block";

    setTimeout(function(){
        successMessage.style.display = "none";
    },2000);


    expenseName.value = "";
    expenseAmount.value = "";
    expenseCategory.value = "";
    expenseType.value = "";
});


function saveToFirebase(expense){
    push(ref(db, "expenses"), expense);
}

function loadFromFirebase(){

    const expenseRef = ref(db, "expenses");

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

    row.innerHTML = `
       <span>${emoji} ${exp.name}</span>
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
    remove(ref(db, "expenses/" + exp.id));
        
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
    personalBudget = Number(personalBudgetInput.value);

    if(personalBudget <= 0){
        alert("Enter valid personal budget");
        return;
    }

    updateBudgetUI();
});

setGroupBudgetBtn.addEventListener("click", function(){
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