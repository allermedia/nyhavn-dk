Import-Module WebAdministration

# Create the FTP site
$FTPSiteName = 'Website FTP'
$FTPRootDir = 'G:\inetpub'
$FTPPort = 21
New-WebFtpSite -Name $FTPSiteName -Port $FTPPort -PhysicalPath $FTPRootDir
