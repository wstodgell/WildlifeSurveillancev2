# 🐾 Wildlife Health Surveillance Cloud Solution (WATCH)

A cloud-native solution designed to support the **Wildlife Health Surveillance (WHS) Program**, enabling secure genomic analysis, data storage, and cross-agency collaboration through scalable AWS infrastructure. Built with AWS CDK.

---

## 🌍 Project Context

The Wildlife Health Surveillance (WHS) Program is dedicated to monitoring and detecting pathogens affecting wildlife populations, which can potentially spill over to humans, posing a significant public health risk. To facilitate this work, the WHS Program requires a robust and scalable IT solution for the genomic analysis of wildlife samples, storage of genomic sequence data, and sharing of results with various stakeholders, including wildlife health organizations, research institutions, and public health agencies.

---

## 🧪 Key Use Cases

- **Rabies Surveillance:** Detecting and analyzing viral samples from wildlife populations.
- **Chronic Wasting Disease Monitoring:** Tracking disease patterns in deer populations to inform health strategy.

---

## ⚙️ AWS Architecture (via CDK)

This solution is split across modular stacks:

| Stack | Purpose |
|-------|---------|
| `EcrStack` | Manages ECR repositories for IoT containers |
| `EcsStack` | Deploys ECS Fargate services for IoT telemetry publishing |
| `IotCodeStack` | Automates IoT Thing creation, policy assignment, cert management |
| `DataIngestionStack` | Handles ingestion pipelines |
| `DataAnalyticsStack` | Sets up batch compute environments for genomic analysis |
| `AuthStack` | Centralized authentication and role management |
| `AmplifyStack` | Front-end hosting for UI and dashboards |

---

## 🔐 Security Features

- Secure secrets storage using AWS Secrets Manager
- Fine-grained IAM roles for ECS tasks
- Automated IoT cert/key management
- Role-based access to genomic data

---

## 📦 Tech Stack

- **AWS CDK** (TypeScript)
- **ECR, ECS, IoT Core, Secrets Manager, CloudWatch**
- **Python + Linux environments for genomics**
- **Amplify + Auth (optional frontend)**

---

## 📁 Repo Structure

```bash
├── lib/
│   ├── iot/
│   │   ├── ecr-stack.ts
│   │   ├── ecs-stack.ts
│   │   ├── iot-stack.ts
│   │   └── helpers/
│   │       ├── ecs-factory.ts
│   │       └── iot-factory.ts
│   └── platform/
│       ├── data-ingestion-stack.ts
│       ├── data-analytics-stack.ts
│       ├── auth-stack.ts
│       └── amplify-stack.ts
├── bin/
│   └── cdk.ts
├── README.md
└── cdk.json
```

---

## 🚀 Deployment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Bootstrap the CDK environment:
   ```bash
   cdk bootstrap
   ```

3. Deploy:
   ```bash
   cdk deploy --all
   ```

---

## 🧰 Admin Roles

- **Cloud Architect & Lead:** Oversees design and deployment
- **Data Management Lead:** Manages genomic data pipelines and compliance

---

## 📎 Resources

- [📘 Design Doc (PDF)](link-to-pdf)
- [📖 Blog: Deploying IoT Genomics with AWS CDK](your-blog-link)
- [📊 Live Demo (if applicable)](link)

---

## 📜 License

MIT
