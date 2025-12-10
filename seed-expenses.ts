// Seed Expense Data with Recurring Flags
// Run this in browser console to add test data

const testExpenses = [
  {
    expenseNumber: 'EXP-2411-0001',
    date: '2024-11-01',
    category: 'rent',
    amount: 25000,
    paymentMode: 'bank',
    description: 'Office Rent - November 2024',
    status: 'paid',
    createdBy: 'Admin',
    // Recurring expense fields
    isRecurring: true,
    recurringType: 'monthly',
    monthlyAmount: 25000,
    dailyRate: 25000 / 30 // ₹833.33 per day
  },
  {
    expenseNumber: 'EXP-2411-0002',
    date: '2024-11-05',
    category: 'salary',
    amount: 150000,
    paymentMode: 'bank',
    description: 'Employee Salaries - November 2024',
    status: 'paid',
    createdBy: 'Admin',
    // Recurring expense fields
    isRecurring: true,
    recurringType: 'monthly',
    monthlyAmount: 150000,
    dailyRate: 150000 / 30 // ₹5,000 per day
  },
  {
    expenseNumber: 'EXP-2411-0003',
    date: '2024-11-08',
    category: 'utilities',
    amount: 15000,
    paymentMode: 'bank',
    description: 'Electricity, Water - November 2024',
    status: 'paid',
    createdBy: 'Admin',
    // Recurring expense fields
    isRecurring: true,
    recurringType: 'monthly',
    monthlyAmount: 15000,
    dailyRate: 15000 / 30 // ₹500 per day
  },
  {
    expenseNumber: 'EXP-2411-0004',
    date: '2024-11-12',
    category: 'marketing',
    amount: 20000,
    paymentMode: 'bank',
    description: 'Digital Marketing Campaign',
    status: 'paid',
    createdBy: 'Admin',
    // Recurring expense fields
    isRecurring: true,
    recurringType: 'monthly',
    monthlyAmount: 20000,
    dailyRate: 20000 / 30 // ₹666.67 per day
  },
  {
    expenseNumber: 'EXP-2411-0005',
    date: '2024-11-15',
    category: 'other',
    amount: 10000,
    paymentMode: 'cash',
    description: 'Miscellaneous Expenses',
    status: 'paid',
    createdBy: 'Admin',
    // Recurring expense fields
    isRecurring: true,
    recurringType: 'monthly',
    monthlyAmount: 10000,
    dailyRate: 10000 / 30 // ₹333.33 per day
  }
]

// To use: Copy this array and add to localStorage
console.log('Test Expenses:', testExpenses)

// Add to localStorage
const existingExpenses = JSON.parse(localStorage.getItem('thisai_crm_expenses') || '[]')
testExpenses.forEach((expense, index) => {
  existingExpenses.push({
    ...expense,
    id: `exp_test_${Date.now()}_${index}`,
    createdAt: new Date().toISOString()
  })
})
localStorage.setItem('thisai_crm_expenses', JSON.stringify(existingExpenses))
console.log('✅ Test expenses added to localStorage!')

// Expected Results for Nov 1-23 (23 days):
// - Rent: ₹25,000 ÷ 30 × 23 = ₹19,167
// - Salary: ₹150,000 ÷ 30 × 23 = ₹115,000
// - Utilities: ₹15,000 ÷ 30 × 23 = ₹11,500
// - Marketing: ₹20,000 ÷ 30 × 23 = ₹15,333
// - Other: ₹10,000 ÷ 30 × 23 = ₹7,667
// Total: ₹168,667 (instead of ₹220,000)
