<?php
namespace Werkint;

use \ZipArchive;

class Hasher
{

    protected $dirSrc;
    protected $dirDest;

    public function __construct($dirSrc, $dirDest) {
        $this->dirSrc = $dirSrc;
        $this->dirDest = $dirDest;
    }

    public function hash()
    {
        $dir_src = $this->dirSrc;
        $dir_dest = $this->dirDest;
        $list = file($dir_src . '/.packages');

        $hashTable = array();

        $count = 0;
        foreach ($list as $package) {
            $package = trim($package);
            echo 'Compiling ' . $package . "\n";

            // Папка пакета-источника
            $pdir = $dir_src . '/' . $package;
            $pname = $pdir . '/.package.ini';
            $data = parse_ini_file($pname, true);
            // Папка пакета-приемника
            $tdir = $dir_dest . '/' . $package;
            $this->rmDir($tdir);
            mkdir($tdir);
            symlink($pname, $tdir . '/.package.ini');

            // Перечень файлов и зависимостей
            $lfiles = explode(',', $data['files']['files']);
            $lres = explode(',', $data['files']['res']);
            $deps = explode(',', $data['files']['deps']);

            // Хеши файлов
            $hashes = array();
            foreach (array_merge($lfiles, $lres) as $file) {
                if (!($file = trim($file))) {
                    continue;
                }
                if (is_dir($pdir . '/' . $file)) {
                    $zip = new ZipArchive();
                    $zip->open($tdir . '/' . $file . '.tar', ZipArchive::CREATE);
                    $this->addDirectoryToZip(
                        $zip, $pdir . '/' . $file, $pdir
                    );
                    $zip->close();
                    $file .= '.tar';
                } else {
                    symlink($pdir . '/' . $file, $tdir . '/' . $file);
                }
                $hashes[] = sha1($file) . '=' . sha1(file_get_contents($tdir . '/' . $file));
            }
            $hashes = join("\n", $hashes) . "\n";
            file_put_contents($tdir . '/.hashes', $hashes);

            $hashTable[] = sha1($package) . '=' . sha1($hashes);
            $count++;
        }

        file_put_contents($dir_dest . '/.hashes', join("\n", $hashTable) . "\n");
        return $count;
    }

    protected function rmDir($directory, $empty = false)
    {
        if (is_link($directory)) {
            unlink($directory);
            return true;
        }
        if (substr($directory, -1) == '/') {
            $directory = substr($directory, 0, -1);
        }
        if (!file_exists($directory) || !is_dir($directory)) {
            return false;
        } elseif (is_readable($directory)) {
            $handle = opendir($directory);
            while (false !== ($item = readdir($handle))) {
                if ($item != '.' && $item != '..') {
                    $path = $directory . '/' . $item;
                    if (is_dir($path)) {
                        $this->rmDir($path);
                    } else {
                        unlink($path);
                    }
                }
            }
            closedir($handle);
            if ($empty == false) {
                if (!rmdir($directory)) {
                    return false;
                }
            }
        }
        return true;
    }

    protected function addDirectoryToZip(ZipArchive $zip, $dir, $base)
    {
        $newFolder = str_replace($base, '', $dir);
        $zip->addEmptyDir($newFolder);
        foreach (glob($dir . '/*') as $file) {
            if (is_dir($file)) {
                $zip = $this->addDirectoryToZip($zip, $file, $base);
            } else {
                $newFile = str_replace($base, '', $file);
                $zip->addFile($file, $newFile);
            }
        }
        return $zip;
    }
}