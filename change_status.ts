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

        for (const task_id of task_ids) {
            let endpoint = `https://api.clickup.com/api/v2/task/${task_id}/?custom_task_ids=true&team_id=${team_id}`
            await axios.put(endpoint, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                }
            }).then(
                    (result) => {
                    let new_status = result.data.status.status
                    core.info(`Changed the status of ${task_id} to ${new_status} successfully.`)
                }
            ).catch(
                function (error) {
                    failed = true
                    core.info(`${task_id} error: ${error.message}`)
                }
            )
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
