<?php
/**
 * Script to remove white background from PNG image
 * Access via: http://localhost/my-app/public/remove_bg.php
 */

$inputPath = __DIR__ . '/images/cartoon.png';
$outputPath = __DIR__ . '/images/cartoon.png';

if (!file_exists($inputPath)) {
    die("File not found: $inputPath");
}

// Load the image
$image = imagecreatefrompng($inputPath);
if (!$image) {
    // Try loading as other formats
    $image = imagecreatefromjpeg($inputPath);
    if (!$image) {
        $image = imagecreatefromgif($inputPath);
    }
}

if (!$image) {
    die("Could not load image");
}

$width = imagesx($image);
$height = imagesy($image);

// Create a new true color image with alpha channel
$newImage = imagecreatetruecolor($width, $height);

// Enable alpha blending and save full alpha channel
imagealphablending($newImage, false);
imagesavealpha($newImage, true);

// Create transparent color
$transparent = imagecolorallocatealpha($newImage, 0, 0, 0, 127);

// Fill with transparent
imagefill($newImage, 0, 0, $transparent);

// Threshold for white detection (adjust if needed)
$threshold = 240; // Colors above this are considered "white"
$tolerance = 30;  // Tolerance for edge smoothing

for ($x = 0; $x < $width; $x++) {
    for ($y = 0; $y < $height; $y++) {
        $rgb = imagecolorat($image, $x, $y);
        $r = ($rgb >> 16) & 0xFF;
        $g = ($rgb >> 8) & 0xFF;
        $b = $rgb & 0xFF;
        
        // Check if pixel is white or near-white
        if ($r > $threshold && $g > $threshold && $b > $threshold) {
            // Make it transparent
            $newColor = imagecolorallocatealpha($newImage, $r, $g, $b, 127);
        } else if ($r > ($threshold - $tolerance) && $g > ($threshold - $tolerance) && $b > ($threshold - $tolerance)) {
            // Semi-transparent for edge smoothing
            $alpha = (int)(127 * (($r + $g + $b) / 3 - ($threshold - $tolerance)) / $tolerance);
            $alpha = min(127, max(0, $alpha));
            $newColor = imagecolorallocatealpha($newImage, $r, $g, $b, $alpha);
        } else {
            // Keep original color
            $newColor = imagecolorallocatealpha($newImage, $r, $g, $b, 0);
        }
        
        imagesetpixel($newImage, $x, $y, $newColor);
    }
}

// Backup original
copy($inputPath, __DIR__ . '/images/cartoon_backup.png');

// Save the new image
imagepng($newImage, $outputPath, 9);

// Cleanup
imagedestroy($image);
imagedestroy($newImage);

echo "✅ Background removed successfully!<br>";
echo "Original backed up to: images/cartoon_backup.png<br>";
echo "New image saved to: images/cartoon.png<br>";
echo "<br><img src='/images/cartoon.png' style='background: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; max-width: 400px;'>";
