<?php
namespace Werkint;

ob_start();
$curdir = dirname(realpath(__FILE__));
require_once($curdir . '/hash.php');

$hasher = new Hasher(
    $curdir . '/src',
    __DIR__ . '/packages'
);
$res = $hasher->hash();

ob_end_clean();
echo $res ? 'processed ' . $res . ' packages' : 'error';