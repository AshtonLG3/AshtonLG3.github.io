<?php
// CHANGE THIS TO YOUR EMAIL ADDRESS
$to = "info@bridgeangelscakes.co.za"; 

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = htmlspecialchars($_POST['name']);
    $phone = htmlspecialchars($_POST['phone']);
    $date = htmlspecialchars($_POST['date']);
    $quantity = htmlspecialchars($_POST['quantity']);
    $message = htmlspecialchars($_POST['message']);
    
    // Handle checkboxes (Order Type)
    $orderTypes = isset($_POST['orderType']) ? implode(", ", $_POST['orderType']) : "Not Selected";

    $subject = "New Cake Inquiry from " . $name;
    
    $body = "You have received a new inquiry via your website:\n\n";
    $body .= "Name: " . $name . "\n";
    $body .= "Phone: " . $phone . "\n";
    $body .= "Event Date: " . $date . "\n";
    $body .= "Items: " . $orderTypes . "\n";
    $body .= "Quantity: " . $quantity . "\n\n";
    $body .= "Details:\n" . $message;

    $headers = "From: noreply@bridgeangelscakes.co.za";

    // Send email
    if (mail($to, $subject, $body, $headers)) {
        // Redirect back to website with success message
        echo "<script>alert('Quote requested successfully! Bridget will contact you soon.'); window.location.href='index.html';</script>";
    } else {
        echo "<script>alert('Sorry, there was an error sending your quote. Please try WhatsApp instead.'); window.location.href='index.html';</script>";
    }
}
?>
