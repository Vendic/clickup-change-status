import * as core from '@actions/core'
// import * as github from '@actions/github'
import axios, { AxiosResponse } from 'axios'

const run = async (): Promise<void> => {
    try {
        const token = core.getInput('clickup_token')
        const task_ids = core.getMultilineInput('clickup_custom_task_ids')
        const team_id = core.getInput('clickup_team_id')
        const target_status = core.getInput('clickup_status')
        const body = {
            "status": target_status
        }

        for (const task_id of task_ids) {
            let endpoint = `https://api.clickup.com/api/v2/task/${task_id}/?custom_task_ids=true&team_id=${team_id}`
            let result: AxiosResponse = await axios.put(endpoint, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                }
            })
            let new_status = result.data.status.status
            core.info(`Changed the status of ${task_id} to ${new_status} successfully.`)
        }

    } catch (error) {
        core.setFailed(`Action failed: ${error}`)
    }
}

run()

export default run
