# Quick See

A collaborative timetable manager and daily preparation tracker built for university batches.

## Description

College timetables change constantly—professors swap lecture slots, cancel morning classes at the last minute, or shift rooms across campus. Usually, these updates get lost in messy WhatsApp group chats, and students end up showing up to empty lecture halls or forgetting required lab manuals.

Quick See fixes this by keeping an entire class batch in sync. A student or Class Representative uploads a timetable image or PDF syllabus once, and the app extracts all lecture times, room numbers, and course codes into a shared schedule. If a class gets rescheduled or canceled, any verified batch member can update the slot so everyone's calendar reflects it in real time. It also features a nightly 9:00 PM alert that checks the next day's timetable and peer checklists to tell students exactly which books, records, and lab gear to pack.

### Screenshots

![Dashboard Overview](img_5.png)

![Timetable Schedule View](img_6.png)

![AI Timetable Parser](img_7.png)

![Daily Item Checklist](img_8.png)

![Study Tools and Flashcards](img_9.png)

## Getting Started

### Dependencies

* **Node.js:** v18.17.0 or higher (v20+ recommended)
* **npm:** v9.0.0 or higher
* **Operating System:** Windows 10/11, macOS, or Linux
* **Browser:** Any modern browser supporting Web Push (Chrome, Edge, Firefox, Brave)
* **API Accounts:**
  * Free [Supabase](https://supabase.com) project for PostgreSQL database, auth, and realtime channels.
  * Free [Google AI Studio](https://aistudio.google.com) key for timetable document parsing.

### Installing

1. Clone the repository:
```bash
git clone https://github.com/kumarisupriya-dev/Quick_See.git
cd Quick_See/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration file:
Create a `.env.local` file inside the `frontend/` directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_client_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_google_gemini_api_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
CRON_SECRET=your_nightly_cron_authorization_key
```

### Executing program

1. Run development server:
```bash
npm run dev
```

2. Open your browser and navigate to:
```text
http://localhost:3000
```

3. Build and test production build:
```bash
npm run build
npm run start
```

## Help

* **Notification Permission Not Prompting:** If the notification bell does not prompt for permission, make sure notifications aren't blocked in your browser site settings (`chrome://settings/content/notifications`) and that you are accessing via `localhost` or `https`.
* **Missing Batch Records on Login:** If your courses don't appear after signing up, ensure you selected or created a valid batch during the `/onboarding` step so your user profile links to a `batch_id`.
* **Gemini API 400/500 Errors:** Make sure your `GEMINI_API_KEY` is active and has permissions for the `gemini-2.5-flash` model in Google AI Studio.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
