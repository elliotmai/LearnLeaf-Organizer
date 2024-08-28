# LearnLeaf Organizer

LearnLeaf Organizer is a single-user task and project management tool designed specifically for students. The application helps students manage their assignments, subjects, and projects efficiently, with features like calendar integration, notifications, and more.

## Features

### Assignment Management
- **Create, Edit, Delete Assignments**: Easily manage assignments with details like subject, name, priority, status, start date, due date, and project association.
- **View Assignments**: See all assignments in a dedicated view or within the context of their associated subject or project.
- **Assignment Notifications**: Receive reminders and notifications about upcoming deadlines.

### Calendar Integration
- **Calendar View**: View assignments and deadlines in a calendar format.
- **Modify Assignments from Calendar**: Edit or delete assignments directly from the calendar view.

### Subject Management
- **Create, Edit, Delete Subjects**: Manage subjects with details like name, semester, and color coding.
- **Archive Subjects**: Archive subjects to declutter your workspace and unarchive them if needed.

### Project Management
- **Create, Edit, Delete Projects**: Organize your assignments under projects with features to monitor progress via a doughnut chart.
- **View Project Progress**: Track the status of associated assignments and view the next assignment due date.

### User Account Management
- **User Registration & Login**: Create an account and manage your personal information.
- **Manage Preferences**: Customize settings like time format, date format, and notification preferences.

### Additional Features
- **Search and Filter**: Easily search for specific assignments and filter them by various criteria such as due date or priority.
- **Archives**: Access completed assignments, archived subjects, and projects.

## Pages

- **Login Page**: Entry point to the application.
- **Assignments View**: Main page displaying all assignments after login.
- **Calendar View**: Visualize your assignments in a calendar format.
- **Subjects View**: Manage and view all assignments related to specific subjects.
- **Project Dashboard**: View projects and their associated assignments with a progress chart.
- **Archive Page**: Access archived subjects, projects, and completed assignments.
- **User Profile**: Manage user information and settings.

## Design

The application's color palette includes:

- **Opal**: #B6CDC8
- **Mineral Green**: #355147
- **Leather**: #9F6C5B
- **Hemp**: #907474
- **Misty Blue**: #5B8E9F
- **Orchid**: #8E5B9F
- **Scarlet**: #F3161E

## Known Issues & Future Enhancements

### Current Fixes:
- Change all instances of “Task” to “Assignment”.
- Implement email notifications.
- Add search and filter options to subject and project views.
- Fix month overflow issues (e.g., 01-Oct showing as 31-Sep).
- UI improvements.

### Expansion Scope:
- Add assignment creation directly from the calendar.
- Introduce assignment descriptions and subtasks.
- Mass import assignments from Excel/CSV.
- Create recurring assignments.
- Implement Canvas REST API for subject, assignment, and quiz management.
- Possible future features:
  - Multi-user support.
  - Mobile application version.
  - Statistics page (e.g., number of classes taken, projects done, assignments completed, etc.).

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/elliotmai/LearnLeaf-Organizer.git
    ```
2. Navigate to the project directory:
    ```bash
    cd LearnLeaf-Organizer
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Start the application:
    ```bash
    npm start
    ```
