import * as core from '@actions/core';
import run from '../change_status';
import nock from 'nock';

describe('Change Status Action', () => {
    const clickUpApiBase = 'https://api.clickup.com/api/v2/task';
    const teamId = '123';
    let targetStatus: string;

    let failedMock: jest.SpyInstance;
    let infoMock: jest.SpyInstance;
    let warningMock: jest.SpyInstance;
    let errorMock: jest.SpyInstance;

    const setEnvVars = (status: string, customTaskIds = 'ABC-123\nDEF-123') => {
        process.env['INPUT_CLICKUP_STATUS'] = status;
        process.env['INPUT_CLICKUP_CUSTOM_TASK_IDS'] = customTaskIds;
    };

    const mockClickUpApi = (taskId: string, currentStatus: string, targetStatus: string, success = true) => {
        const taskReply = {
            id: taskId,
            custom_id: null,
            name: 'Updated Task Name',
            text_content: 'Updated Task Content',
            description: 'Updated Task Content',
            status: {
                status: currentStatus,
                color: '#d3d3d3',
                orderindex: 1,
                type: 'custom',
            },
        };

        nock(clickUpApiBase)
            .get(new RegExp(`/${taskId}/\\?custom_task_ids=true&team_id=\\d+`))
            .reply(200, taskReply);

        if (success) {
            taskReply.status.status = targetStatus;
            nock(clickUpApiBase)
                .put(new RegExp(`/${taskId}/\\?custom_task_ids=true&team_id=\\d+`))
                .reply(200, taskReply);
        } else {
            nock(clickUpApiBase)
                .put(new RegExp(`/${taskId}/\\?custom_task_ids=true&team_id=\\d+`))
                .reply(500);
        }
    };

    beforeAll(() => {
        process.env['INPUT_CLICKUP_TOKEN'] = 'xyz';
        process.env['INPUT_CLICKUP_TEAM_ID'] = teamId;
    });

    beforeEach(() => {
        targetStatus = 'approved';
        setEnvVars(targetStatus);

        failedMock = jest.spyOn(core, 'setFailed').mockImplementation(jest.fn());
        infoMock = jest.spyOn(core, 'info').mockImplementation(jest.fn());
        warningMock = jest.spyOn(core, 'warning').mockImplementation(jest.fn());
        errorMock = jest.spyOn(core, 'error').mockImplementation(jest.fn());
    });

    afterEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    afterAll(() => {
        delete process.env['INPUT_CLICKUP_TOKEN'];
        delete process.env['INPUT_CLICKUP_TEAM_ID'];
    });

    it('successfully changes the status of multiple ClickUp tasks', async () => {
        targetStatus = 'in review';
        setEnvVars(targetStatus);

        mockClickUpApi('ABC-123', 'open', targetStatus);
        mockClickUpApi('DEF-123', 'open', targetStatus);

        await run();

        expect(infoMock).toHaveBeenCalledWith(
            `Changed the status of ABC-123 to ${targetStatus} successfully.`
        );
        expect(infoMock).toHaveBeenCalledWith(
            `Changed the status of DEF-123 to ${targetStatus} successfully.`
        );
        expect(failedMock).not.toHaveBeenCalled();
    });

    it('handles API failures gracefully', async () => {
        mockClickUpApi('ABC-123', 'in progress', targetStatus, false);
        setEnvVars(targetStatus, 'ABC-123');

        await run();

        expect(failedMock).toHaveBeenCalledWith(
            'Action failed: One of the API requests has failed. Please check the logs for more details.'
        );
    });

    it('does not change the status from "done" to "approved"', async () => {
        targetStatus = 'approved';
        setEnvVars(targetStatus, 'ZXC-987');

        mockClickUpApi('ZXC-987', 'done', targetStatus, false);

        await run();

        expect(warningMock).toHaveBeenCalledWith(
            `Cannot change the status of ZXC-987 from done to ${targetStatus}. Skipping...`
        );
    });

    it('does not change the status from "done" to "in progress"', async () => {
        targetStatus = 'in progress';
        setEnvVars(targetStatus, 'ZXC-987');

        mockClickUpApi('ZXC-987', 'done', targetStatus, false);

        await run();

        expect(warningMock).toHaveBeenCalledWith(
            `Cannot change the status of ZXC-987 from done to ${targetStatus}. Skipping...`
        );
    });

    it('changes the status from "done" to "todo"', async () => {
        targetStatus = 'todo';
        setEnvVars(targetStatus, 'ABC-123');

        mockClickUpApi('ABC-123', 'done', targetStatus);

        await run();

        expect(infoMock).toHaveBeenCalledWith(
            `Changed the status of ABC-123 to ${targetStatus} successfully.`
        );
    });

    it('warns and skips tasks that do not exist in ClickUp (404)', async () => {
        setEnvVars(targetStatus, 'ABC-123\nNON-123');

        mockClickUpApi('ABC-123', 'open', targetStatus);
        nock(clickUpApiBase)
            .get(new RegExp(`/NON-123/\\?custom_task_ids=true&team_id=\\d+`))
            .reply(404, { err: 'Task not found' });

        await run();

        expect(infoMock).toHaveBeenCalledWith(
            `Changed the status of ABC-123 to ${targetStatus} successfully.`
        );
        expect(warningMock).toHaveBeenCalledWith('Task NON-123 not found in ClickUp (404), skipping.');
        expect(failedMock).not.toHaveBeenCalled();
    });

    it('warns and skips tasks that return 401 from ClickUp API', async () => {
        setEnvVars(targetStatus, 'FAKE-111');

        nock(clickUpApiBase)
            .get(new RegExp(`/FAKE-111/\\?custom_task_ids=true&team_id=\\d+`))
            .reply(401, { err: 'Token invalid' });

        await run();

        expect(warningMock).toHaveBeenCalledWith('Task FAKE-111 not found in ClickUp (401), skipping.');
        expect(failedMock).not.toHaveBeenCalled();
    });

    it('fails when GET returns a non-404/401 error (e.g. 500)', async () => {
        setEnvVars(targetStatus, 'ABC-123');

        nock(clickUpApiBase)
            .get(new RegExp(`/ABC-123/\\?custom_task_ids=true&team_id=\\d+`))
            .reply(500, { err: 'Internal Server Error' });

        await run();

        expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('ABC-123 GET error:'));
        expect(failedMock).toHaveBeenCalledWith(
            'Action failed: One of the API requests has failed. Please check the logs for more details.'
        );
    });
});
