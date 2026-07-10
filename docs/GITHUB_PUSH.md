# Publish the Velunee foundation to GitHub

Target repository:

```text
https://github.com/Minhazsiraji/Velunee.git
```

## From the Git bundle

```bash
git clone Velunee_MVP_Foundation.bundle Velunee
cd Velunee
git remote remove origin
git remote add origin https://github.com/Minhazsiraji/Velunee.git
git push -u origin main
```

This creates the initial `main` branch in the currently empty GitHub repository. Use feature branches for the next milestones.

## From the source ZIP

```bash
unzip Velunee_MVP_Foundation.zip -d Velunee
cd Velunee
git init
git switch -c main
git add .
git commit -m "feat: bootstrap Velunee MVP foundation"
git remote add origin https://github.com/Minhazsiraji/Velunee.git
git push -u origin main
```

GitHub may ask you to sign in through the browser or a credential manager. Do not paste a personal access token into project files or chat messages.
