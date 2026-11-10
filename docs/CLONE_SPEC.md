# Pixel-Clone Visual Specification (`docs/CLONE_SPEC.md`)
**Source Reference**: `sohel-frontend_.mp4` (65.5s, 67 extracted reference frames at 1536×776px)  
**Target Viewport**: 1536×800 (CSS viewport matching 1918×1010 at 125% display scaling)  
**Target Branch**: `ui-clone`  
**Brand Palette Source**: VIIT Emblem Logo (Dark Navy `#0B2038`, Primary Navy `#014A97`, Cyan Star Accent `#0498ED`, Soft Tint `#EAF3FC`)

---

## 1. Design System & Token Foundation

### 1.1 Color Palette
- **Canvas / Page Background**: `#FAFAFA`
- **Surface Cards / Panels**: Pure white `#FFFFFF`
- **Muted Surface / Soft Cards**: `#F7F7F7` (landing flow cards) and `#F5F6F8` (icon boxes)
- **Hairline Borders**: `#E6E8EB` (1px solid on cards, tabs, dividers)
- **Input Borders**: `#D0D5DD` (focus ring: `rgba(1, 74, 151, 0.15)` with `#014A97` border)
- **Ink / Primary Text**: `#111111` (used for headline text and primary black pill buttons)
- **Body Text**: `#1F2933`
- **Muted Text / Secondary Labels**: `#6B7280`
- **Subtle Captions / Slashes**: `#9CA3AF`
- **Brand Navy (from VIIT Logo)**:
  - Primary Accent: `#014A97`
  - Dark Header / Text: `#0B2038`
  - Light Active Tint: `#EAF3FC`
  - Subtle Highlight Border: `rgba(1, 74, 151, 0.2)`
- **Cyan Accent (from Star in VIIT Logo)**: `#0498ED` (used for waveform accent in phone mockup and focus rings)
- **Issue / Alert Tokens**:
  - Alert Text: `#C2410C`
  - Alert Icon: `#EA580C`
  - Alert Background Tint: `#FFF1E6`
  - Alert Border: `#FDBA74`
  - Upload Error Banner: Background `#FDF1EE`, border `#F5C9C0`, text `#7F1D1D`
- **Success / Status Dot**:
  - Green Dot / Check: `#10B981` (emerald-500)
  - Green Soft Tint: `#ECFDF5`
  - Green Text: `#047857`

### 1.2 Typography System
- **Display / Headings**: `Plus Jakarta Sans`, sans-serif
  - Hero H1: `72px`, line-height `0.95`, font-weight `700`, letter-spacing `-0.045em`
  - Section H2: `56px`, line-height `1.05`, font-weight `700`, letter-spacing `-0.035em`
  - App Page H1: `46px`, line-height `1.1`, font-weight `700`, letter-spacing `-0.03em`
  - Step Card Title: `22px`, font-weight `700`, letter-spacing `-0.02em`
- **Body & Controls**: `Inter`, sans-serif
  - Eyebrows: `11px`, font-weight `600`, letter-spacing `0.18em`, uppercase
  - Body Regular: `16px`, line-height `1.5`, font-weight `400` / `500`
  - UI Labels & Buttons: `14px`, font-weight `600`
  - Captions & Breadcrumbs: `13px` / `14px`, font-weight `500`, `#6B7280`
  - Department / Class Subtitle: `9px` / `10px`, font-weight `700`, letter-spacing `0.2em`, uppercase

### 1.3 Geometry & Radii
- **Full Pill Controls**: `border-radius: 9999px` (buttons, status pills, filter chips)
- **Standard Cards**: `border-radius: 18px`
- **Large Panels / Hero Containers**: `border-radius: 24px` to `28px`
- **Inputs & Form Controls**: `border-radius: 12px`
- **Icon Boxes**: `border-radius: 12px` to `14px`
- **Phone Mockup**: `border-radius: 44px`, 6px dark outer frame

### 1.4 Elevation & Shadows
- **Soft Floating Elevation**: `box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06)`
- **Hover Lift**: `transform: translateY(-2px)`, `box-shadow: 0 12px 36px rgba(0, 0, 0, 0.09)`
- **Transition Duration**: `180ms ease-in-out`

---

## 2. Screen-by-Screen Visual Blueprint

### Screen 1: Public Landing Page - Top Nav & Hero (Frames 000-004)
- **Header**:
  - Height: `100px`, max-width `1222px`, centered horizontally.
  - Left: Brand Mark:
    - 40×40px rounded square (`#111111`, radius `12px`) with 5-bar white audio waveform SVG.
    - Title: `VIIT` (bold 18px) + `AI Feedback` (regular 18px).
    - Subtitle: `DEPARTMENT OF CSE` (9px, tracking `0.2em`, uppercase, `#6B7280`).
  - Center Nav:
    - `Home` (`#111111`, font-weight 600)
    - `How it works` (`#6B7280`, font-weight 500)
    - `Issue resolution` (`#6B7280`, font-weight 500)
  - Right:
    - Black pill button: `Admin portal ↗` (height `40px`, padding `0 20px`, text 14px bold, radius 9999px).
- **Hero Center Block**:
  - Eyebrow: `VIIT · INTELLIGENT PARENT COMMUNICATION` with leading `6px` emerald green pulsing dot.
  - Headline H1 (2 lines):
    - Line 1: `Connect with parents.`
    - Line 2: `Listen. Act. Resolve.`
  - Subhead: `Student updates. Parent feedback. One connected campus.` (16px, `#555555`).
  - CTA Button: Black pill `Prepare your call list ↗` (approx 210×52px, text 15px bold).
- **Phone Mockup & Floating Cards**:
  - Phone: `280px` wide, `border-radius: 44px`, `6px` dark frame (`#111111`), dynamic island pill at top.
  - Phone Interior:
    - Status bar: `9:41` with signal & battery indicators.
    - App row: 20px black "V" icon + `VIIT AI Feedback` + outlined `PREVIEW` pill badge.
    - Center avatar: `64px` pale-cyan circle (`#E0F2FE`) with headphones icon and green active status badge.
    - Headline: `A little conversation. A better connection.`
    - Audio wave visualization (cyan bars animating).
    - Language switcher pill: `English` | `తెలుగు`
    - Call script card: `"Hello, I'm calling from VIIT about your child's attendance and academic progress."`
  - 4 Tilted Floating Cards (±3° to 6° tilt, soft shadow):
    - Top Left (-4°): `Student data, ready.` (Light blue file icon box, `Attendance · Marks · Feedback`, check circle).
    - Top Right (+4°): `Every conversation counts.` (Green double-check icon box, green pill `Summary saved`, `Parent responses and call notes, together in one place.`, hairline divider, `Ready for Excel ↗`).
    - Bottom Left (+3°): `A familiar conversation` (Language/translate icon, mini waveform, `Telugu or English. Their choice.`).
    - Bottom Right (-3°): `A concern? We follow through.` (Orange-tinted `#FFF1E6`, bell icon `#EA580C`, `Assigned → Resolved → Confirmed`).
- **Mountain Ridge Backdrop**:
  - Recreated in clean SVG vector paths behind the phone mockup.
  - 3 layered silhouettes: `#2A2A2A` (back), `#4A4A4A` (middle), `#8A8A8A` (front peaks), fading to white at bottom gradient.

### Screen 2: Stat Strip & "From Data to Dialogue" (Frames 005-007)
- **Stat Strip**:
  - 4 horizontal items separated by subtle vertical dividers, top hairline border:
    1. `1–5 simultaneous calls` (phone broadcast icon)
    2. `~1 minute conversations` (timer / clock icon)
    3. `Telugu & English` (bilingual globe icon)
    4. `One retry if unanswered` (refresh / arrow icon)
- **Section "FROM DATA TO DIALOGUE"**:
  - Eyebrow: `FROM DATA TO DIALOGUE` (11px uppercase, tracking `0.18em`).
  - H2: `A simple flow. A meaningful connection.`
  - Subtitle: `Attendance updates or honest feedback. Every call starts with the right context.`
  - 3 Soft Cards (`#F7F7F7`, radius `28px`, approx 354×262px):
    - **Card 01**: Upload icon in 46px white box, `01` in top right, Title: `Start with student data`, Text: `Choose a class. Upload and confirm your student list.`
    - **Card 02**: Phone icon in 46px white box, `02` in top right, Title: `Prepare the conversation`, Text: `Choose mentoring or feedback. Set questions and preferences.`, Tag pills: `Attendance / mentoring` and `Feedback`.
    - **Card 03**: Document icon in 46px white box, `03` in top right, Title: `Everything in view`, Text: `Review campaigns, student records, and call history.`

### Screen 3: Issue Resolution "Heard. Handled. Followed through." (Frames 008-011)
- Eyebrow: Orange dot + `THE CONVERSATION DOESN'T END HERE`.
- 2-Column Split:
  - **Left Column**:
    - H2: `Heard. Handled. Followed through.`
    - Paragraph: `When a parent raises a concern, it reaches the right owner. A follow-up call checks the resolution, and the loop continues until the parent confirms.`
    - 3 Owner Role Badges: `College coordinator`, `Hostel dean`, `Bus correspondent`.
  - **Right Column (Rounded Panel `#F5F5F5`, radius 28px)**:
    - Row 1: Bell icon in white box, `Alert the right owner` / `Routes to college, hostel, or bus.`
    - Row 2: Orange wrench/sparkle icon, `Address the concern` / `The designated owner takes action.`
    - Row 3: Green phone icon, `Call back. Confirm. Close.` with emerald check circle.
    - Bottom caption: `Not resolved? Follow up again.`

### Screen 4: Split-Screen Login (`/admin` and `/login`) (Frames 012-016)
- **Layout**: Exact 50/50 vertical split.
- **Left 50% Panel**:
  - Background: Soft greyscale sky gradient (`#DEDEDE` to `#F8F8F8`) with SVG mountain ridge along bottom.
  - Top Left: Brand mark (black waveform box + `VIIT AI Feedback` + `DEPARTMENT OF CSE`).
  - Eyebrow: `VIIT · ADMIN WORKSPACE`.
  - Headline: `A closer campus starts with you.` (72px, 3 lines).
  - 3 Numbered Steps with outline circles:
    - `01 Choose your class`
    - `02 Prepare your campaign`
    - `03 Keep it all in view`
  - Bottom: `Student updates. Meaningful connections.` + VIIT college emblem logo.
- **Right 50% Panel (White)**:
  - Top Left: `← Back to home` link button.
  - Centered Form Column (`394px` wide):
    - 58×58px rounded icon box with lock icon `🔒` (subtle border, soft shadow).
    - Eyebrow: `ADMIN PORTAL`.
    - H2: `Welcome back.` (44px bold).
    - Subtitle: `Sign in to your workspace.`
    - Email Input: `56px` height, radius `12px`, leading mail icon, placeholder `you@college.edu`.
    - Password Input: `56px` height, radius `12px`, leading lock icon, trailing eye toggle.
    - Full-width Black Pill Button: `Sign in →` (height `52px`, radius `28px`).
    - Security note: Shield icon + `Authorized staff only`.
    - Demo Accounts Quick-Select (rendered only when `VITE_DEMO_MODE=true`).

### Screen 5: Post-Login Transition Overlay (Frames 017-018)
- Full-screen `#FAFAFA` container.
- Centered 40px waveform brand mark.
- Animated loading spinner.
- Subtitle: `Opening your workspace...` (800ms transition before dashboard reveal).

### Screen 6: App Shell & Dashboard (`/app`) (Frames 019-026)
- **Sidebar (256px wide, White, 1px right border `#E6E8EB`)**:
  - Header: Brand mark + `DEPARTMENT OF CSE`.
  - Section Header: `WORKSPACE` (11px, tracking `0.18em`).
  - Nav Items (`48px` height, radius `12px`, 16px icons):
    - `Dashboard` (LayoutGrid)
    - `New campaign` (PlusCircle with right `+` chip when active)
    - `Reports & history` (BarChart3)
    - `Issues` (AlertCircle with orange notification dot when open issues > 0)
    - `Users & classes` (Users)
    - `Settings` (Settings)
  - Footer items:
    - Status pill: `● Saved on this device`
    - `Visit homepage ↗`
    - `Sign out` (LogOut icon)
- **Top Bar (86px height, White, bottom border `#E6E8EB`)**:
  - Breadcrumb: `Workspace > Dashboard` (14px muted).
  - Right: User avatar circle (36px, `#E5E7EB` with initials), User name (14px bold), Email (12px muted).
- **Dashboard Main Content**:
  - Eyebrow: `YOUR WORKSPACE, AT A GLANCE`.
  - Header Row: H1 `Let's get connected.` + Right black pill button `+ New campaign`.
  - Subhead: `A new conversation starts with a well-prepared campaign.`
  - **3 Stat Cards** (`border-radius: 18px`, white, 1px border):
    - Card 1: `Prepared campaigns` / `00` (Stack icon)
    - Card 2: `Student records` / `00` (Users icon)
    - Card 3: `Completed calls` / `00` (Phone icon, caption `Calling not connected` in empty state)
  - **Guide Card Container** (Large soft-grey gradient card, radius `24px`):
    - Left: Eyebrow `A FEW STEPS. ALL SET.`, H2 `From student list to ready-to-go.`, Black pill `Create campaign ↗`.
    - Right: 3 stacked white rows with check circles:
      - `01 Select your class` / `Department · Year · Section`
      - `02 Add your students` / `Upload · Validate · Confirm`
      - `03 Make it yours` / `Questions · Settings · Review`
  - Lists below: "Recent campaigns", Admin "Waiting for your approval", and "Open issues".

### Screen 7-13: 7-Step Campaign Wizard (`/app/new`) (Frames 027-057)
- **Wizard Header**:
  - Eyebrow: `NEW CAMPAIGN`
  - Title & Subhead update per step:
    - Step 1: `Select a department.` / `Start with the right team.`
    - Step 2: `Choose the year.` / `Select the student batch.`
    - Step 3: `Select the section.` / `Keep the conversation focused.`
    - Step 4: `Choose your module.` / `Two paths. One connected campus.`
    - Step 5: `Add your students.` / `Upload, review, and confirm.`
    - Step 6: `Make it yours.` / `Questions · Settings · Preferences.`
    - Step 7: `Review and launch.` / `Summary · Checklist · Confirmation.`
  - Right: Step indicator `STEP 0X / 07` (32px bold grey step number).
- **Stepper Row**:
  - 7 numbered items: `Department`, `Year`, `Section`, `Module`, `Students`, `Questions`, `Review`.
  - Active: Filled dark circle + underline bar.
  - Completed: Emerald green circle with white checkmark.
  - Slashes breadcrumb row underneath: `CSE / 3rd year / Section F / Attendance / mentoring`.
- **Step 1: Department Grid**:
  - 3 columns of SelectCards (`CSE`, `CSE-AI`, `IT`, `ECE`, `EEE`, `MECH`, `CIVIL`).
  - Card: 18px radius, min-height 186px, 44px icon box top-left, radio check top-right, 22px bold title, muted subtitle.
- **Step 2: Academic Year**:
  - 4 cards in a row (`01 1st year`, `02 2nd year`, `03 3rd year`, `04 4th year`).
  - Watermark numbers `01`-`04` in 52px bold grey `#4B5563`, graduation cap icon.
- **Step 3: Section**:
  - 3×2 grid of cards `A` through `F` with people icon and 40px bold letter.
- **Step 4: Module Selection**:
  - 2 Cards:
    - Card A: `Mentoring & attendance` (`Attendance, academics, and student support.`)
    - Card B: `Feedback` (`Class, hostel, and transport experiences.`)
  - Attendance date picker (default today).
- **Step 5: Student List Upload (Frames 042-049)**:
  - Large dashed dropzone (`265px` height, `1px dashed #D5D8DD`, radius `18px`).
  - 58px white icon box with upload icon and soft shadow.
  - Title: `Drop your student list here.` (24px bold).
  - Subtitle: `CSV or Excel · Up to 5 MB · 5,000 students`.
  - Black pill button: `Browse files →`.
  - Dropzone Footer: Left: file icon + `First worksheet only`, Right: download icon + `Download template`.
  - **Inline Error Banner (when validation fails)**:
    - Directly below dropzone.
    - Background `#FDF1EE`, border `#F5C9C0`, radius `12px`, alert icon, dark red-brown text `#7F1D1D`.
    - Lists required columns: `roll_number`, `student_name`, `parent_name`, `parent_phone`, `attendance_status`.
    - Actions: `Download template` link and `Map columns`.
  - **Roster Preview Table**:
    - Appears when file is valid.
    - Cards formatted with masked phone numbers (`+91 98*** **345`).
    - Stat badges: Total, Present, Absent, No usable phone.
    - Version badge (e.g. `Version 2`) if replacing an earlier upload.
- **Step 6: Questions & Settings (Admin edit / Faculty read-only)**:
  - Language toggle (`Telugu`, `English`, `Bilingual`), Voice model, Purpose notes, Calling hours (`09:00 - 18:00`), Retries.
- **Step 7: Review & Confirm**:
  - Complete campaign summary card and validation checklist.
  - Action buttons:
    - Faculty role: `Send to Admin →` (with discard draft option).
    - Admin / Principal role: `Confirm and start →` (opens modal with live calling reminder and confirmation).
- **Wizard Bottom Bar**:
  - Hairline border top.
  - Left: Grey pill `← Back` (48px height).
  - Center: Muted hint `Next: [Step Name]`.
  - Right: Black pill `Continue →` (disabled = `#E8EAEE` until selection made).

### Screen 14: Reports & History (`/app/reports`) (Frames 058-062)
- H1 `Reports & history.`, Subtitle `Campaigns, conversations, and their outcomes.`, Right black button `+ New campaign`.
- **3 Stat Cards**:
  - `Campaigns prepared` (`00`)
  - `Calls completed` (`00`)
  - `Responses collected` (`00`)
- **Tabs**:
  - `Campaigns [count chip]` (with solid black underline when active)
  - `Call history`
- Filters: Search bar `Search campaigns...` and select `All modules`.
- Empty state: Clean white card with document icon, `No campaigns yet.`, `Confirmed campaigns will appear here.`
- Call detail drawer/modal: Masked phone, bilingual transcripts, sentiment summary, export button.

### Screen 15: Extension Screens in Matching Visual Language
- **Issues Board (`/app/issues`)**:
  - Orange accent theme (`#C2410C`, `#FFF1E6`).
  - Columns: `Open`, `In Progress`, `Resolved`, `Closed`.
  - Grievance state machine with confirmation call loop (Parent confirmation via automated call).
  - Reopen counter: Critical flag triggered if reopened >= 3 times.
- **Live Monitor (`/app/campaign/monitor/:id`)**:
  - Banner: `Calling service (demo)` with demo mode indicator.
  - Live progress ring, active calling count, call status grid, animated waveform, controls (`Pause`, `Resume`, `Stop`).
- **Users & Classes (`/app/users-classes`)**:
  - Academic hierarchy management (Departments, Years, Sections).
  - User role assignment table.
- **Settings (`/app/settings`)**:
  - Calling window hours, max retries, confirmation call timing (`Immediately` / `Within calling hours`), activity log audit trail.

---

## 3. Brand Assets & Vector Recreations
- **Audio Waveform SVG Brand Glyph**:
  - 5 vertical rounded bars: heights `[12, 22, 16, 26, 14]` centered in a `40×40` rounded box.
- **Mountain Ridge SVG Silhouettes**:
  - Multi-path inline SVG with 3 smooth cubic bezier mountain layers:
    - Layer 1 (Dark back): `fill="#2A2A2A"`, `opacity="0.9"`
    - Layer 2 (Mid ridge): `fill="#4A4A4A"`, `opacity="0.7"`
    - Layer 3 (Foreground peaks): `fill="#737373"`, `opacity="0.5"`
    - Bottom fade: Linear gradient mask to `#FAFAFA` / transparent.
- **Phone Mockup**:
  - Outer container `280px` width, aspect ratio approx `9:19.5`, border `6px solid #111111`, radius `44px`.
- **Icons**:
  - Pure SVG vector icons using `lucide-react` (building, graduation-cap, users, upload, phone, check, alert-circle, shield, lock, etc.).

---

## 4. Verification Checkpoint
- This specification documents every screen visible in `sohel-frontend_.mp4` and maps each feature to our non-UI logic layers while strictly maintaining the backend freeze and security model.
