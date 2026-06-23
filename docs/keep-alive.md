# Render Backend Keep-Alive Guide

To prevent the Render free tier instance from going to sleep (spinning down due to 15 minutes of inactivity), we configure an external cron service to ping the `/health` endpoint every 10 minutes.

## Setup Instructions

We use [cron-job.org](https://cron-job.org/) (a free and reliable cron service) to perform these pings.

### 1. Create a cron-job.org account
1. Go to [https://cron-job.org/](https://cron-job.org/) and sign up for a free account.
2. Verify your email address and log in to the dashboard.

### 2. Configure the Cron Job
1. In the dashboard, click on **"Create Cronjob"**.
2. Set the following fields:
   - **Title**: `Spend Analysis API Keep-Alive`
   - **Address**: `https://YOUR-RENDER-APP-NAME.onrender.com/health` (Replace with your actual Render API service domain)
   - **Request Method**: `GET`
   - **Schedule**: Every 10 minutes (Choose "User-defined" -> Minute: `*/10`)
3. Under **Advanced Settings**, ensure:
   - **Connection Timeout**: `30 seconds`
   - **Follow Redirects**: Checked
4. Click **"Create"**.

### 3. Verify Status
- You can monitor execution history under the "History" tab of your cron job to verify that it is successfully receiving HTTP 200 responses.
- The Render service logs should show incoming `/health` requests every 10 minutes, keeping the instance warm and preventing cold-starts.
