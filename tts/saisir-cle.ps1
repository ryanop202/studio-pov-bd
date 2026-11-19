# Demande la clé ElevenLabs et l'enregistre dans tts\cle-elevenlabs.txt (ce fichier n'est jamais envoyé sur GitHub).
$fichier = Join-Path $PSScriptRoot 'cle-elevenlabs.txt'
$sec = Read-Host 'Colle ta clé ElevenLabs puis appuie sur Entrée' -AsSecureString
$cle = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)).Trim()
if ($cle.Length -lt 20) { Write-Host 'Clé trop courte, rien enregistré. Relance la commande.'; exit 1 }
Set-Content -Path $fichier -Value @('# Clé ElevenLabs (privée, ignorée par git)', $cle) -Encoding ascii
Write-Host 'Clé enregistrée.'
