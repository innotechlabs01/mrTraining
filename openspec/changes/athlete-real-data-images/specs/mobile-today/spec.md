# Delta for mobile-today

## REMOVED Requirements

### Requirement: Hardcoded mock content on TodayScreen

`MOCK_RECOMMENDATIONS`, `MOCK_ARTICLES`, the hardcoded Unsplash workout images, and the canned `WEEKLY_CHALLENGE` MUST be removed. No mock constant MAY remain feeding TodayScreen. (Reason: athlete screens must run on real DB data end-to-end; canned content masked total absence of live data.)
(Migration: real sources below replace each mock; re-apply fallback-hidden semantics when live data is empty.)

## ADDED Requirements

### Requirement: Today recommendations from live activeWorkouts

TodayScreen MUST render recommended workouts from the live `activeWorkouts` endpoint, mapping each `activeWorkouts[].contentName` to the first prescription/template exercise image. When an active workout has no image, the card MUST show a fallback placeholder image, never a broken image.

#### Scenario: Live active workouts with images

- GIVEN the account has live active workouts with prescription images
- WHEN TodayScreen loads
- THEN recommendations are rendered from `activeWorkouts`
- AND each card shows the mapped exercise image

#### Scenario: Live active workout without an image

- GIVEN a live active workout whose prescription/template has no image
- WHEN TodayScreen renders its card
- THEN a fallback placeholder is displayed
- AND no hardcoded/mock image is substituted

#### Scenario: No active workouts (empty state)

- GIVEN zero live activeWorkouts
- WHEN TodayScreen loads
- THEN a defined empty state is shown (no mock recommendations)

### Requirement: Today articles from real blog_posts or hidden

TodayScreen articles MUST come from real `blog_posts`. When no real `blog_posts` exist, the articles section MUST be hidden — never populated with mock articles.

#### Scenario: Real articles present

- GIVEN one or more published `blog_posts`
- WHEN TodayScreen loads
- THEN the articles section renders those real posts

#### Scenario: No real articles

- GIVEN zero `blog_posts`
- WHEN TodayScreen loads
- THEN the articles section is hidden
- AND no `MOCK_ARTICLES` items appear

### Requirement: Weekly Challenge from real source or hidden

TodayScreen Weekly Challenge MUST derive from a real source (assigned active workout/challenge). When no real weekly challenge exists, the section MUST be hidden — never shown as a canned challenge.

#### Scenario: Real weekly challenge present

- GIVEN a real assigned weekly challenge
- WHEN TodayScreen loads
- THEN the Weekly Challenge section renders real data

#### Scenario: No weekly challenge

- GIVEN no real weekly challenge source
- WHEN TodayScreen loads
- THEN the Weekly Challenge section is hidden

### Requirement: Mobile image fallback contract

Any prescription/active workout image read on mobile MUST tolerate `null`/missing `imageUrl` and display the app's fallback placeholder. A missing image MUST NOT throw or break the screen.

#### Scenario: Missing imageUrl handled

- GIVEN a screen item with `imageUrl = null`
- WHEN it renders
- THEN an image fallback placeholder is used
- AND the screen continues to function

## MODIFIED Requirements

(No existing requirements — TodayScreen previously had no real-data spec.)