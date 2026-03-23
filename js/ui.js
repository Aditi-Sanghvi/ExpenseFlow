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

   
    expenses.push(expense);

    addExpenseToUI(expense);

    saveToLocalStorage();

    // success message
    successMessage.style.display = "block";

    setTimeout(function(){
        successMessage.style.display = "none";
    },2000);

    // clear inputs
    expenseName.value = "";
    expenseAmount.value = "";
    expenseCategory.value = "";
    expenseType.value = "";
});
const ctx = document.getElementById('expenseChart');

const expenseChart = new Chart(ctx, {
    type: 'pie',
    data: {
        labels: ['Food', 'Travel', 'Shopping', 'Bills', 'Other'],
        datasets: [{
            data: [0,0,0,0,0],
            backgroundColor: [
                '#22c55e',
                '#3b82f6',
                '#a855f7',
                '#ef4444',
                '#6b7280'
            ]
        }]
    }
});

function updateChart(){
    expenseChart.data.datasets[0].data = [
        categoryTotals.Food,
        categoryTotals.Travel,
        categoryTotals.Shopping,
        categoryTotals.Bills,
        categoryTotals.Other
    ];

    expenseChart.update();
}

function saveToLocalStorage(){
    localStorage.setItem("expenses", JSON.stringify(expenses));

}

function loadFromLocalStorage(){
    const data = localStorage.getItem("expenses");

    if(data){
        expenses = JSON.parse(data);

        expenses.forEach(exp => {
            addExpenseToUI(exp);
        });
    }
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

    // delete logic
    const deleteBtn = row.querySelector(".deleteBtn");

    deleteBtn.addEventListener("click", function(){
        if(exp.type === "Personal"){
    personalTotal -= exp.amount;
} else {
    groupTotal -= exp.amount;
}

document.getElementById("personalAmount").textContent = "₹" + personalTotal;
document.getElementById("groupAmount").textContent = "₹" + groupTotal;
        expenseList.removeChild(row);

        total -= exp.amount;
        totalAmount.textContent = "₹" + total;

        categoryTotals[exp.category] -= exp.amount;
        updateChart();

        // remove from array
        expenses = expenses.filter(e => e !== exp);
        saveToLocalStorage();
        
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

        // 🔹 remove active from all
        filterButtons.forEach(btn => btn.classList.remove("active"));

        // 🔹 add active to clicked
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
});
navPersonal.addEventListener("click", function(){
    setActive(this);

    dashboardSection.style.display = "block";
    analyticsSection.style.display = "none";

    expenseList.innerHTML = "";

    total = 0;
    personalTotal = 0;
    groupTotal = 0;
    categoryTotals = { Food:0, Travel:0, Shopping:0, Bills:0, Other:0 };

    expenses
        .filter(exp => exp.type === "Personal")
        .forEach(exp => addExpenseToUI(exp));
});
navGroup.addEventListener("click", function(){
    setActive(this);

    dashboardSection.style.display = "block";
    analyticsSection.style.display = "none";

    expenseList.innerHTML = "";

    total = 0;
    personalTotal = 0;
    groupTotal = 0;
    categoryTotals = { Food:0, Travel:0, Shopping:0, Bills:0, Other:0 };

    expenses
        .filter(exp => exp.type === "Group")
        .forEach(exp => addExpenseToUI(exp));
});