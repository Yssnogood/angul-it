# Angul-It 

A simple Angular application where users complete multiple captcha challenges to prove they are human.

---

## 🛠️ Installation

```bash
git clone <repository-url>
cd Angul-It
npm install
npm start
```

Open: [http://localhost:4200](http://localhost:4200)

---

## 📜 Commands

```bash
npm start      # Run app
npm run build  # Build project
```

---

## 🔄 How It Works

1. Start on the **Home page**
2. Complete captcha challenges step by step
3. Answers are validated before continuing
4. View results at the end
5. Restart if you want

---

## 💾 State Management

* Progress is saved automatically
* Data is stored in **localStorage**
* Progress is restored after refresh

---

## 🔐 Route Protection

* Cannot access results page directly
* Users are redirected if challenge is not completed

---

