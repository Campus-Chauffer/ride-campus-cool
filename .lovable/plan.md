

## Driver Side Implementation Plan

This is a significant feature addition — the entire driver experience from signup through the main app. The work builds on the existing monolithic `CampusChauffeur.jsx` pattern, adding new screens and CSS alongside the passenger flow.

### What Gets Built

**1. Animated Passenger/Driver Toggle (auth screens)**
- Replace the current toggle with a sliding indicator that animates 300ms ease-out when switching between Passenger and Driver
- When "Driver" is selected on signup, the form adds a "Vehicle Plate Number" field
- Login screen also respects the toggle

**2. Driver Signup Flow (3-4 new screens)**
- **driver-selfie** — Upload selfie + driver's license photos
- **driver-vehicle** — Upload front, side, and back photos of the car
- **driver-checklist** — Checklist of working features: AC, headlights, tail lights, indicators, seatbelts, wipers, horn, side mirrors, brake lights
- **driver-submitted** — "Data logged successfully, awaiting approval" confirmation screen
- **driver-pending** — Locked screen shown if approval not yet granted, with a "Check Status" button (demo button to simulate approval)

**3. Driver Main App (home + side menu + nav)**
- **driver-home** — Full map with:
  - Heatmap toggle button (shows colored overlay circles on dense campus areas)
  - Live/Offline toggle button (prominent, changes color)
  - Side menu hamburger + nav bar (Home, Rides, Profile)
  - Driver location marker
- **Driver Side Menu** — Shows:
  - Driver profile + rating
  - Past rides link
  - Account/earnings (total rides, ride types, money per ride, daily total)
  - Commission button → shows total owed (15% per ride), warning prompt at GH₵ 50 threshold
  - Logout
- **driver-rides** — List of past rides from driver perspective (pickup, destination, fare earned, ride type)
- **driver-profile** — Driver stats, rating, vehicle info

**4. Ride Request Flow**
- **Ride request popup** — When live, a popup appears with:
  - Pickup location, destination, passenger name/rating
  - Ride type badge (Standard / AC)
  - Slide-to-accept slider + Decline button
- **driver-topickup** — Map with route to pickup point, passenger info
- **driver-toDestination** — Map with route to destination after passenger pickup
- **driver-arrived** — Trip complete screen showing fare the passenger must pay, ride type

### Technical Approach

All screens added inside the existing `renderInner()` switch statement. New CSS appended to the `CSS` template literal. New state variables added at the top of the `App` component:
- `driverApproved` (boolean, defaults false)
- `driverLive` (boolean)
- `showHeatmap` (boolean)
- `driverRideRequest` (object or null)
- `driverSliderPos` (for slide-to-accept)
- `driverTripPhase` ("topickup" | "enroute" | "arrived")

New demo data constants: `DRIVER_PAST_RIDES`, `DRIVER_CHECKLIST_ITEMS`, `HEATMAP_ZONES`.

The ScreenNav gets updated with driver screen buttons. The toggle slider uses a CSS transition (`transform: translateX(); transition: transform 300ms ease-out`) on an absolute-positioned highlight element inside the toggle row.

### Screen Flow Diagram

```text
Signup (Driver toggle)
  → OTP
    → driver-selfie (selfie + license upload)
      → driver-vehicle (car photos: front, side, back)
        → driver-checklist (AC, lights, seatbelts...)
          → driver-submitted ("Awaiting approval")
            → driver-pending (locked) OR driver-home (approved)

driver-home (map + heatmap toggle + live toggle)
  ├─ Side menu (profile, earnings, commission, past rides)
  ├─ Ride request popup (slide to accept / decline)
  │   → driver-topickup (navigating to passenger)
  │     → driver-enroute (heading to destination)
  │       → driver-arrived (fare display)
  ├─ driver-rides (history)
  └─ driver-profile
```

### Files Modified
- **`src/components/CampusChauffeur.jsx`** — All changes in this single file (following existing pattern): new CSS (~150 lines), new constants, new state, new screen cases (~500 lines of JSX)

