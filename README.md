# Club House

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge\&logo=node.js\&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge\&logo=express\&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-90A93A?style=for-the-badge\&logo=ejs\&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge\&logo=postgresql\&logoColor=white)
---

Create your own secret club. Invite your friends.

## ✨ Features
- **Secretive:** Create your secret group
- **Socialize:** Start posting
- **Privacy:** Anonymity to outsiders.

### 1. Log-in or Sign UP

![login](./readme_assets/login.png)
![signup](./readme_assets/signup.png)

### 2. Create Club & View Club
![create-club](./readme_assets/createClub.png)
![view-club](./readme_assets/viewClub.png)
### 3. Create Club Post 
![post-club](./readme_assets/postClub.png)
### 4. All available clubs
![all-clubs](./readme_assets/allClub.png)

### 5. Inbox 
![inbox](./readme_assets/inbox.png)

### 6. Non-Member Public views
![inbox-public](./readme_assets/public-inbox.png)
![club-public](./readme_assets/public-club.png)

## 🗂 Project Structure
```text
Express-APP-template/
├── src
    ├── auth/               # Handles authentication logic with passportjs
    ├── controllers/        # Request handlers (business logic)
    ├── models/             # Database logic and queries
    ├── routes/             # Application routes
    ├── views/              # EJS templates
    ├── public/             # Static assets (CSS, JS, images)
    ├── app.js              # App entry point
├── package.json
├── .env.example        # Environment variables example
└── README.md
```

---

## ⚙️ Available Scripts

| Command       | Description                                |
| ------------- | ------------------------------------------ |
| `npm run dev` | Starts development server with live reload |
| `npm start`   | Starts production server                   |

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

> Refer to `.env.example` for required variables.

---


## ⭐ Support

If this template helped you, consider giving the repo a ⭐ on GitHub — it really helps!

---
