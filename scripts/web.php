<?php
namespace Werkint;

ob_start();
$curdir = dirname(realpath(__FILE__) . '/..');
require_once(__DIR__ . '/hash.php');

$hasher = new Hasher(
    $curdir . '/src',
    $curdir . '/packages'
);
$res = $hasher->hash();

ob_end_clean();
echo $res ? 'processed ' . $res . ' packages' : 'error';