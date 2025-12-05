<?php
// Set the content type to JSON
header('Content-Type: application/json');

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the raw POST data
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // Basic validation
    if (isset($data['action'])) {
        // In a real application, this is where you would:
        // 1. Authenticate the request.
        // 2. Look up the action in a database.
        // 3. Execute the command on the physical lights (e.g., via cURL to a Philips Hue bridge, or a Zigbee command).
        // 4. Log the event.

        // For this simulation, we'll just send back a success message.
        echo json_encode([
            'status' => 'success',
            'message' => "Action '{$data['action']}' received by the server."
        ]);
    } else {
        // Send an error response if 'action' is not set
        http_response_code(400); // Bad Request
        echo json_encode([
            'status' => 'error',
            'message' => 'Missing action parameter.'
        ]);
    }
} else {
    // Send an error response if the method is not POST
    http_response_code(405); // Method Not Allowed
    echo json_encode([
        'status' => 'error',
        'message' => 'Only POST requests are allowed.'
    ]);
}
?>
