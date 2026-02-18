import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAW-kOP33xeh0pmSuMdTsii9UWyabsnf1E",
    authDomain: "jhgjjgg-2952d.firebaseapp.com",
    databaseURL: "https://jhgjjgg-2952d-default-rtdb.firebaseio.com",
    projectId: "jhgjjgg-2952d",
    storageBucket: "jhgjjgg-2952d.firebasestorage.app",
    messagingSenderId: "322044108118",
    appId: "1:322044108118:web:d12cbc19d4411ede728af7"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let currentSearchedUser = null;

// الدخول للوحة الإدارة
window.checkAdmin = function() {
    const pin = document.getElementById('admin-pin').value;
    if (pin === '1009') {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        loadProducts();
        loadWithdrawals();
    } else {
        alert("الرمز غير صحيح");
    }
};

// التبديل بين التبويبات
window.switchTab = function(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.bottom-nav a').forEach(nav => nav.classList.remove('active'));
    element.classList.add('active');
};

// تنسيق حقل الربح اليومي لإضافة فواصل الآلاف
window.formatInput = function(input) {
    let val = input.value.replace(/,/g, '');
    if(!isNaN(val) && val !== "") {
        input.value = Number(val).toLocaleString('en-US');
    }
};

// --- إدارة المنتجات (البطاقات) ---
window.addProduct = async function() {
    const imgFile = document.getElementById('prod-img').files[0];
    const name = document.getElementById('prod-name').value;
    const period = parseInt(document.getElementById('prod-period').value);
    const price = parseInt(document.getElementById('prod-price').value);
    const dailyProfitStr = document.getElementById('prod-daily').value.replace(/,/g, '');
    const dailyProfit = parseInt(dailyProfitStr);
    const desc = document.getElementById('prod-desc').value;

    if (!imgFile || !name || !period || !price || !dailyProfit) {
        alert("يرجى تعبئة جميع الحقول ورفع الصورة");
        return;
    }

    // تحويل الصورة إلى كود طويل (Base64) وحفظها مباشرة في قاعدة البيانات
    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        
        try {
            const productId = 'prod_' + Date.now();
            await set(ref(db, 'products/' + productId), {
                name: name,
                period: period,
                price: price,
                dailyProfit: dailyProfit,
                description: desc,
                img: base64Image
            });
            
            alert("تمت إضافة البطاقة بنجاح!");
            
            // مسح الحقول
            document.getElementById('prod-name').value = '';
            document.getElementById('prod-period').value = '';
            document.getElementById('prod-price').value = '';
            document.getElementById('prod-daily').value = '';
            document.getElementById('prod-desc').value = '';
            document.getElementById('prod-img').value = '';
        } catch (error) {
            alert("حدث خطأ أثناء الحفظ: " + error.message);
        }
    };
    
    reader.onerror = function() {
        alert("حدث خطأ في قراءة الصورة.");
    };
    
    // قراءة الصورة وتحويلها
    reader.readAsDataURL(imgFile);
};

function loadProducts() {
    onValue(ref(db, 'products'), (snapshot) => {
        const list = document.getElementById('admin-products-list');
        list.innerHTML = '';
        snapshot.forEach(child => {
            const p = child.val();
            const id = child.key;
            list.innerHTML += `
                <div class="admin-list-item">
                    <div style="display:flex; align-items:center;">
                        <img src="${p.img}">
                        <div style="margin-right:10px;">
                            <strong>${p.name}</strong><br>
                            <small>${Number(p.price).toLocaleString()} د.ع</small>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-del" onclick="deleteProduct('${id}')">حذف</button>
                    </div>
                </div>
            `;
        });
    });
}

window.deleteProduct = function(id) {
    if(confirm("هل أنت متأكد من حذف هذه البطاقة؟")) {
        remove(ref(db, 'products/' + id));
    }
};

// --- إدارة المستخدمين ---
window.searchUser = function() {
    const id = document.getElementById('search-id').value;
    if(!id) return;
    
    get(ref(db, 'users/' + id)).then((snapshot) => {
        if(snapshot.exists()) {
            currentSearchedUser = snapshot.val();
            currentSearchedUser.id = id; // حفظ الـ id
            
            document.getElementById('user-details').style.display = 'block';
            document.getElementById('u-name').textContent = "الاسم: " + currentSearchedUser.name;
            document.getElementById('u-balance').textContent = "الرصيد: " + Number(currentSearchedUser.balance).toLocaleString() + " د.ع";
            
            const btnBan = document.getElementById('btn-ban');
            if(currentSearchedUser.banned) {
                btnBan.textContent = "إلغاء الحظر";
                btnBan.style.background = "#2ecc71";
            } else {
                btnBan.textContent = "حظر";
                btnBan.style.background = "#e74c3c";
            }
        } else {
            alert("المستخدم غير موجود");
            document.getElementById('user-details').style.display = 'none';
        }
    });
};

window.adjustBalance = function(isAdding) {
    if(!currentSearchedUser) return;
    const amountStr = document.getElementById('edit-balance-amount').value;
    const amount = parseFloat(amountStr);
    
    if(isNaN(amount) || amount <= 0) return;
    
    let newBalance = currentSearchedUser.balance;
    if(isAdding) {
        newBalance += amount;
    } else {
        newBalance -= amount;
        if(newBalance < 0) newBalance = 0;
    }
    
    update(ref(db, 'users/' + currentSearchedUser.id), { balance: newBalance }).then(() => {
        alert("تم تحديث الرصيد بنجاح");
        document.getElementById('edit-balance-amount').value = '';
        searchUser(); // تحديث العرض
    });
};

window.toggleBan = function() {
    if(!currentSearchedUser) return;
    const isCurrentlyBanned = currentSearchedUser.banned || false;
    
    update(ref(db, 'users/' + currentSearchedUser.id), { banned: !isCurrentlyBanned }).then(() => {
        alert("تم تحديث حالة الحظر");
        searchUser();
    });
};

// --- السحوبات ---
function loadWithdrawals() {
    onValue(ref(db, 'withdrawals'), (snapshot) => {
        const list = document.getElementById('withdrawals-list');
        list.innerHTML = '';
        snapshot.forEach(child => {
            const w = child.val();
            const id = child.key;
            if(w.status === 'pending') {
                const date = new Date(w.timestamp).toLocaleDateString('ar');
                list.innerHTML += `
                    <div class="admin-list-item" style="flex-direction:column; align-items:flex-start;">
                        <strong>الاسم: ${w.name} (ID: ${w.userId})</strong>
                        <small>التاريخ: ${date}</small>
                        <div class="item-actions" style="margin-top:10px;">
                            <button style="background:#2ecc71;" onclick="updateWithdrawalStatus('${id}', 'completed')">إتمام</button>
                            <button class="btn-del" onclick="updateWithdrawalStatus('${id}', 'rejected')">رفض</button>
                        </div>
                    </div>
                `;
            }
        });
        if(list.innerHTML === '') {
            list.innerHTML = '<p style="text-align:center; color:#888;">لا توجد طلبات سحب معلقة</p>';
        }
    });
}

window.updateWithdrawalStatus = function(reqId, status) {
    update(ref(db, 'withdrawals/' + reqId), { status: status });
};
