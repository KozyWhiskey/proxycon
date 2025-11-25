# Feature: AI Commentary

## Objective
Integrate the Vercel AI SDK with a Google Gemini model to generate sarcastic, one-sentence "roasts" or commentary for each match result. This commentary will be displayed in the dashboard's feed.

## Implementation Steps

1.  **Create API Route for Commentary (`app/api/commentary/route.ts`):**
    -   Create a new API route handler. This will be a `POST` request handler.
    -   The handler will receive match data in its body, including the winner's name, loser's name, and the game format.
    -   Use the `@ai-sdk/google` library to connect to the Gemini API. Ensure your `GOOGLE_API_KEY` is available in `.env.local`.
    -   Construct a prompt for the AI. Example:
        ```
        "Generate a one-sentence, sarcastic, and witty commentary roasting the loser of a game.
        The game was ${format}. The winner was ${winnerName} and the loser was ${loserName}."
        ```
    -   Use the `generateText` function from the Vercel AI SDK to call the Gemini model.
    -   Return the generated text as a JSON response.

2.  **Update Match Logging Actions:**
    -   Modify the `submitResult` (for tournaments) and `logCasualMatch` (for casual) server actions.
    -   After the match data has been successfully saved to the database, make a `fetch` call from the server action to your new `/api/commentary` endpoint.
    -   Send the necessary winner/loser data in the POST request.
    -   Take the AI-generated commentary from the response.

3.  **Add Commentary to Database:**
    -   Add a new nullable `text` column to the `matches` table in Supabase. Name it `ai_commentary`.
    -   After receiving the commentary from the API, update the corresponding `matches` row to store the AI-generated string in this new column.

4.  **Display Commentary in the Dashboard:**
    -   In the `app/page.tsx` dashboard component, when you fetch the recent matches, make sure to select the new `ai_commentary` column.
    -   Pass this data to "The Feed" component.
    -   In the feed, render the `ai_commentary` text for each match. Style it as specified in the project summary (italicized, `text-muted-foreground`).

## Testing Plan

1.  **Test API Route Directly:**
    -   Use a tool like `curl`, Postman, or a simple script to send a `POST` request to `http://localhost:3000/api/commentary`.
    -   Provide a sample JSON body: `{ "winnerName": "Dave", "loserName": "Steve", "format": "Magic: The Gathering" }`.
    -   **Expected Outcome:** The API should respond with a 200 OK status and a JSON object containing a single string of witty commentary.

2.  **Test Integration with Match Reporting:**
    -   Log a new match result (either tournament or casual).
    -   **Expected Outcome:**
        -   The match should be saved as before.
        -   In the Supabase `matches` table, the row for the new match should have a non-null value in the `ai_commentary` column.

3.  **Test Dashboard Display:**
    -   After logging a match that has generated commentary, navigate to the dashboard (`/`).
    -   **Expected Outcome:** The match should appear in "The Feed", and the sarcastic commentary should be displayed beneath the main result, correctly styled.

4.  **Test Error Handling:**
    -   Temporarily disable your AI API key in the `.env.local` file.
    -   Log another match.
    -   **Expected Outcome:** The match should still be logged successfully in the database, but the `ai_commentary` field should be `NULL`. The application should not crash. The server action should gracefully handle the failed API call.
