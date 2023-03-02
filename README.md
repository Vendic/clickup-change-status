# Clickup change status action [![Tests](https://github.com/Tjitse-E/clickup-change-status/actions/workflows/tests.yml/badge.svg)](https://github.com/Tjitse-E/clickup-change-status/actions/workflows/tests.yml)
Github action to automatically change the status of task in Clickup

## Example usage
``` 
      - name: Set clickup task status
        uses: Tjitse-E/clickup-change-status@v1
        with:
          clickup_token: 'clickup-token-here'
          clickup_team_id: 'clickup-team-id-here'
          clickup_custom_task_ids: TEST-1234
          clickup_status: 'in progress'

```
