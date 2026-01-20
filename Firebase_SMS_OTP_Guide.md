# Firebase 手機簡訊 OTP 串接指南

## 目錄
1. [前置準備](#前置準備)
2. [Firebase Console 設定](#firebase-console-設定)
3. [Web 端實作](#web-端實作)
4. [iOS 端實作](#ios-端實作)
5. [Android 端實作](#android-端實作)
6. [常見問題與注意事項](#常見問題與注意事項)

---

## 前置準備

### 1. 建立 Firebase 專案
- 前往 [Firebase Console](https://console.firebase.google.com/)
- 建立新專案或選擇現有專案
- 升級至 Blaze 方案（簡訊驗證需要付費方案）

### 2. 啟用 Phone Authentication
1. 在 Firebase Console 中，進入「Authentication」
2. 點選「Sign-in method」
3. 啟用「Phone」驗證方式

---

## Firebase Console 設定

### 配置應用程式
1. 註冊你的應用程式（iOS、Android 或 Web）
2. 下載配置檔案：
   - iOS: `GoogleService-Info.plist`
   - Android: `google-services.json`
   - Web: 複製 Firebase Config 物件

### 設定測試電話號碼（選用）
在開發階段，可以設定測試電話號碼避免發送真實簡訊：
1. Authentication > Sign-in method > Phone
2. 展開「Phone numbers for testing」
3. 新增測試號碼和對應的驗證碼

---

## Web 端實作

### 1. 安裝 Firebase SDK

```bash
npm install firebase
```

### 2. 初始化 Firebase

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
```

### 3. 設定 reCAPTCHA

Firebase 需要 reCAPTCHA 來防止濫用。有兩種方式：

#### 方式 A: 可見的 reCAPTCHA（推薦）

```javascript
import { RecaptchaVerifier } from 'firebase/auth';

// 在 HTML 中準備一個容器
// <div id="recaptcha-container"></div>

window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  'size': 'normal',
  'callback': (response) => {
    // reCAPTCHA 驗證成功
    console.log('reCAPTCHA verified');
  },
  'expired-callback': () => {
    // reCAPTCHA 過期
    console.log('reCAPTCHA expired');
  }
});
```

#### 方式 B: 隱形 reCAPTCHA

```javascript
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'sign-in-button', {
  'size': 'invisible',
  'callback': (response) => {
    // 自動觸發
  }
});
```

### 4. 發送驗證碼

```javascript
import { signInWithPhoneNumber } from 'firebase/auth';

function sendOTP(phoneNumber) {
  const appVerifier = window.recaptchaVerifier;

  signInWithPhoneNumber(auth, phoneNumber, appVerifier)
    .then((confirmationResult) => {
      // 簡訊已發送，儲存 confirmationResult 供後續驗證使用
      window.confirmationResult = confirmationResult;
      console.log('OTP sent successfully');
      // 顯示輸入驗證碼的 UI
    })
    .catch((error) => {
      console.error('Error sending OTP:', error);
      // 處理錯誤：重置 reCAPTCHA
      grecaptcha.reset(window.recaptchaWidgetId);
    });
}

// 使用範例（電話號碼需包含國碼）
sendOTP('+886912345678');
```

### 5. 驗證 OTP

```javascript
function verifyOTP(code) {
  const confirmationResult = window.confirmationResult;

  confirmationResult.confirm(code)
    .then((result) => {
      // 驗證成功，用戶已登入
      const user = result.user;
      console.log('User signed in:', user.uid);
      // 導向應用程式主頁
    })
    .catch((error) => {
      console.error('Invalid OTP:', error);
      // 顯示錯誤訊息
    });
}

// 使用範例
verifyOTP('123456');
```

### 完整範例（React）

```jsx
import { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// Firebase 配置和初始化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function PhoneAuth() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [message, setMessage] = useState('');

  // 初始化 reCAPTCHA
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': (response) => {
          console.log('reCAPTCHA verified');
        }
      });
    }
  };

  // 發送 OTP
  const handleSendOTP = async () => {
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setMessage('OTP 已發送到你的手機');
    } catch (error) {
      console.error('Error:', error);
      setMessage('發送失敗：' + error.message);
    }
  };

  // 驗證 OTP
  const handleVerifyOTP = async () => {
    try {
      const result = await confirmationResult.confirm(otp);
      setMessage('登入成功！使用者 ID：' + result.user.uid);
    } catch (error) {
      console.error('Error:', error);
      setMessage('驗證失敗：' + error.message);
    }
  };

  return (
    <div>
      <h2>手機簡訊驗證</h2>

      <div>
        <input
          type="tel"
          placeholder="+886912345678"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <button onClick={handleSendOTP}>發送驗證碼</button>
      </div>

      <div id="recaptcha-container"></div>

      {confirmationResult && (
        <div>
          <input
            type="text"
            placeholder="輸入驗證碼"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={handleVerifyOTP}>驗證</button>
        </div>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}

export default PhoneAuth;
```

---

## iOS 端實作

### 1. 安裝 Firebase SDK

使用 CocoaPods：

```ruby
# Podfile
pod 'Firebase/Auth'
```

```bash
pod install
```

或使用 Swift Package Manager。

### 2. 配置專案

1. 將 `GoogleService-Info.plist` 加入專案
2. 在 `AppDelegate.swift` 初始化：

```swift
import Firebase

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()
    return true
}
```

### 3. 配置 APNs（推送通知）

Firebase iOS 簡訊驗證需要 APNs：

1. 啟用 Push Notifications capability
2. 上傳 APNs 憑證到 Firebase Console
3. 實作推送通知處理：

```swift
import UserNotifications

// 請求推送通知權限
UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
    if granted {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}

// 註冊 APNs token
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Auth.auth().setAPNSToken(deviceToken, type: .unknown)
}

// 處理推送通知
func application(_ application: UIApplication,
                 didReceiveRemoteNotification userInfo: [AnyHashable : Any],
                 fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    if Auth.auth().canHandleNotification(userInfo) {
        completionHandler(.noData)
        return
    }
}
```

### 4. 發送和驗證 OTP

```swift
import FirebaseAuth

class PhoneAuthViewController: UIViewController {

    // 發送驗證碼
    func sendOTP(phoneNumber: String) {
        PhoneAuthProvider.provider().verifyPhoneNumber(phoneNumber, uiDelegate: nil) { verificationID, error in
            if let error = error {
                print("Error sending OTP: \(error.localizedDescription)")
                return
            }

            // 儲存 verificationID 供後續使用
            UserDefaults.standard.set(verificationID, forKey: "authVerificationID")
            print("OTP sent successfully")
        }
    }

    // 驗證 OTP
    func verifyOTP(code: String) {
        guard let verificationID = UserDefaults.standard.string(forKey: "authVerificationID") else {
            print("No verification ID found")
            return
        }

        let credential = PhoneAuthProvider.provider().credential(
            withVerificationID: verificationID,
            verificationCode: code
        )

        Auth.auth().signIn(with: credential) { authResult, error in
            if let error = error {
                print("Error verifying OTP: \(error.localizedDescription)")
                return
            }

            if let user = authResult?.user {
                print("User signed in: \(user.uid)")
            }
        }
    }
}

// 使用範例
sendOTP(phoneNumber: "+886912345678")
verifyOTP(code: "123456")
```

---

## Android 端實作

### 1. 安裝 Firebase SDK

在 `build.gradle` (project level)：

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

在 `build.gradle` (app level)：

```gradle
plugins {
    id 'com.google.gms.google-services'
}

dependencies {
    implementation 'com.google.firebase:firebase-auth-ktx'
    implementation 'com.google.android.gms:play-services-auth-phone:21.0.0'
}
```

### 2. 配置專案

將 `google-services.json` 放入 `app/` 目錄。

### 3. 發送驗證碼

```kotlin
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import java.util.concurrent.TimeUnit

class PhoneAuthActivity : AppCompatActivity() {

    private lateinit var auth: FirebaseAuth
    private var verificationId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        auth = FirebaseAuth.getInstance()
    }

    // 發送 OTP
    fun sendOTP(phoneNumber: String) {
        val options = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(phoneNumber)           // 電話號碼
            .setTimeout(60L, TimeUnit.SECONDS)     // 超時時間
            .setActivity(this)                     // Activity
            .setCallbacks(callbacks)               // 回調
            .build()

        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    // 回調處理
    private val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {

        override fun onVerificationCompleted(credential: PhoneAuthCredential) {
            // 自動驗證成功（某些情況下會自動完成）
            signInWithPhoneAuthCredential(credential)
        }

        override fun onVerificationFailed(e: FirebaseException) {
            // 驗證失敗
            Log.e("PhoneAuth", "Verification failed", e)
        }

        override fun onCodeSent(
            verificationId: String,
            token: PhoneAuthProvider.ForceResendingToken
        ) {
            // 驗證碼已發送
            this@PhoneAuthActivity.verificationId = verificationId
            Log.d("PhoneAuth", "Code sent")
        }
    }

    // 驗證 OTP
    fun verifyOTP(code: String) {
        verificationId?.let { id ->
            val credential = PhoneAuthProvider.getCredential(id, code)
            signInWithPhoneAuthCredential(credential)
        }
    }

    // 使用憑證登入
    private fun signInWithPhoneAuthCredential(credential: PhoneAuthCredential) {
        auth.signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    val user = task.result?.user
                    Log.d("PhoneAuth", "User signed in: ${user?.uid}")
                } else {
                    Log.e("PhoneAuth", "Sign in failed", task.exception)
                }
            }
    }
}

// 使用範例
sendOTP("+886912345678")
verifyOTP("123456")
```

### 4. 自動讀取簡訊（選用）

Android 可以自動讀取簡訊驗證碼：

```kotlin
// 在 AndroidManifest.xml 加入權限
<uses-permission android:name="android.permission.RECEIVE_SMS" />

// 使用 SMS Retriever API
import com.google.android.gms.auth.api.phone.SmsRetriever

val client = SmsRetriever.getClient(this)
val task = client.startSmsRetriever()

task.addOnSuccessListener {
    // 等待簡訊
}

task.addOnFailureListener {
    // 啟動失敗
}
```

---

## 常見問題與注意事項

### 1. 電話號碼格式
- 必須使用完整的國際格式（E.164）
- 台灣範例：`+886912345678`（不是 `0912345678`）
- 中國範例：`+8613800138000`
- 美國範例：`+14155552671`

### 2. 費用
- Firebase 簡訊驗證會收費
- 價格依國家/地區而異
- 可在 Firebase Console 查看使用量和費用
- 建議設定預算警示

### 3. 配額限制
- 預設每個專案每日有發送限制
- 每個電話號碼每日有接收限制
- 可在 Firebase Console 申請提高配額

### 4. 安全性建議
- 啟用 App Check 防止濫用
- 不要在客戶端硬編碼測試電話號碼
- 實作速率限制防止暴力攻擊
- 監控異常的驗證請求

### 5. 測試建議
- 開發時使用測試電話號碼避免費用
- 測試不同的錯誤情境（錯誤驗證碼、過期等）
- 測試網路中斷情況的處理

### 6. reCAPTCHA 問題（Web）
- 如果 reCAPTCHA 無法載入，檢查網域是否已授權
- 在 Firebase Console > Authentication > Settings 中新增授權網域
- localhost 預設已授權，無需額外設定

### 7. iOS 特定問題
- 確保已正確配置 APNs
- 檢查 Push Notifications capability 是否啟用
- 測試時需要真實裝置（模擬器可能無法接收推送）

### 8. Android 特定問題
- 確保 `google-services.json` 檔案是最新的
- 檢查 SHA-1 憑證指紋是否已加入 Firebase Console
- 測試自動簡訊驗證功能

### 9. 錯誤處理
常見錯誤碼：
- `auth/invalid-phone-number`：電話號碼格式錯誤
- `auth/missing-phone-number`：未提供電話號碼
- `auth/quota-exceeded`：超過配額限制
- `auth/invalid-verification-code`：驗證碼錯誤
- `auth/code-expired`：驗證碼已過期

### 10. 多因素驗證
Firebase 也支援將手機簡訊作為第二因素驗證（2FA），詳見 Firebase 官方文件。

---

## 相關資源

- [Firebase Authentication 官方文件](https://firebase.google.com/docs/auth)
- [Phone Authentication 指南](https://firebase.google.com/docs/auth/web/phone-auth)
- [價格資訊](https://firebase.google.com/pricing)
- [Firebase Console](https://console.firebase.google.com/)

---

**建立日期：** 2026-01-20
**適用版本：** Firebase SDK 最新版本
