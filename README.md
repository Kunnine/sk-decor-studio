# SK Decor Studio

**Inventory & Sales Management System**

A modern inventory and point-of-sale (POS) management system designed for SK Decor Studio, a home decoration and interior accessories business.

## Overview

SK Decor Studio helps manage products, inventory, purchases, customers, suppliers, and daily sales through a centralized management system. It provides tools to monitor stock levels, process sales, and generate business reports.

## Features

- **Dashboard** – Overview of sales, inventory, and business activities.
- **Product Management** – Add, edit, delete, and manage products with images.
- **Category Management** – Organize home decoration products into categories.
- **Point of Sale (POS)** – Process sales and manage current transactions.
- **Inventory Management** – Track stock quantities and stock movements.
- **Purchase Management** – Record purchases and manage suppliers.
- **Customer Management** – Manage customer information.
- **Sales Management** – View and manage sales transactions.
- **Reports & Analytics** – Monitor business performance and generate reports.
- **User Management** – Manage system users and access.
- **Notifications** – Receive low-stock alerts and system notifications.
- **Audit Logs** – Track important system activities.

## Technology Stack

**Frontend**
- React.js
- TypeScript
- Tailwind CSS
- Vite

**Backend**
- Laravel
- PHP
- RESTful API

**Database**
- MySQL (configure through Laravel environment settings)

**Tools**
- Git & GitHub
- Docker
- VS Code

## Project Structure

```text
sk-decor-studio/
├── backend/
│   ├── app/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   ├── resources/
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   └── package.json
│
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Kunnine/sk-decor-studio.git
cd sk-decor-studio
```

### 2. Set Up the Backend

```bash
cd backend
composer install
```

Copy `.env.example` to `.env` and configure your database connection.

Generate the application key:

```bash
php artisan key:generate
```

Create your database, then run:

```bash
php artisan migrate --seed
```

Start the backend:

```bash
php artisan serve
```

### 3. Set Up the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Configure the frontend API URL to connect to your backend.

## Environment Configuration

Do not upload your actual `.env` file or database credentials to GitHub.

Use `.env.example` as a template for environment configuration.

## Project Purpose

This project demonstrates the development of a full-stack inventory and sales management solution for a home decoration retail business.

## Author

**Kunnine**

GitHub: https://github.com/Kunnine

---

© 2026 SK Decor Studio. All rights reserved.
