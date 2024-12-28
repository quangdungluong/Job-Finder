# LinkedIn-Job-Explorer

## Configurations
This project requires sensitive information for its configuration. **Do not share or commit sensitive files, such as `secrets.yaml`, to version control.**

### `secrets.yaml`
If you are running the project in an interactive mode, you can leave sensitive fields (`email` and `password`) empty during setup.

1. Navigate to the `configs` directory
```bash
cd configs
```
2. Copy the sample secrets file
```bash
cp secrets.yaml.sample secrets.yaml
```
3. Update the `secrets.yaml` file with your LinkedIn credentials.
- `email`: Your LinkedIn Email
- `password`: Your LinkedIn Password

### `work_preferences.yaml`
This file allows you to customize your job search preferences. Update this file to reflect your desired settings.
- `date`: Specify a time range for job postings by setting one range to `true` and others to `false`.

- `positions`: List the job titles you're interested in. Each title should be listed on a separate line.

    Example:
    ```yaml
    positions:
    - Software Developer
    - Data Scientist
    ```

- `locations`: List the locations you want to search for jobs in. Each location should be listed on a separate line.

    Example:
    ```yaml
    locations:
    - Vietnam
    - Singapore
    ```

- `titleBlacklist`: List keywords in job titles that you want to exclude. Each keyword should be listed on a separate line.

    Example:
    ```yaml
    titleBlacklist:
    - Sales
    - Marketing
    ```
