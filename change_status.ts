import * as core from '@actions/core'
import axios from 'axios'

const run = async (): Promise<void> => {
    try {
        let failed : boolean = false;
        const token = core.getInput('clickup_token')
        const task_ids = core.getMultilineInput('clickup_custom_task_ids')
        const team_id = core.getInput('clickup_team_id')
        const target_status = core.getInput('clickup_status')
        const body = {
            "status": target_status
        }
        const config = {
            headers:{
                'Content-Type': 'application/json',
                'Authorization': token
            }
        };

        for (const task_id of task_ids) {
            try {
                const result = await axios.get(
                    `https://api.clickup.com/api/v2/task/${task_id}/?custom_task_ids=true&team_id=${team_id}`,
                    config
                )
                core.info(`${task_id} has status ${result.data.status.status} and wants to move to ${target_status}`);

                if (result.data.status.status === 'done' && target_status === 'approved') {
                    core.warning(`Cannot change the status of ${task_id} from done to approved. Skipping...`);
                    continue;
                }

                const putResult = await axios.put(
                    `https://api.clickup.com/api/v2/task/${task_id}/?custom_task_ids=true&team_id=${team_id}`,
                    body,
                    config
                )

                let new_status = putResult.data.status.status;
                core.info(`Changed the status of ${task_id} to ${new_status} successfully.`);
            } catch (error: any) {
                failed = true;
                const errorMessage = error?.message || JSON.stringify(error);
                core.info(`${task_id} error: ${errorMessage}`);
            }
        }

        if (failed) {
           throw 'One of the API requests has failed. Please check the logs for more details.'
        }

    } catch (error) {
        core.setFailed(`Action failed: ${error}`)
    }
}

run()

export default run
